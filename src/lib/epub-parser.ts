import JSZip from "jszip";
import { xml2js } from "xml-js";
import type { Book, Paragraph } from "./types";

interface ManifestItem {
  _attributes: {
    id: string;
    href: string;
    "media-type": string;
  };
}

interface SpineItem {
  _attributes: {
    idref: string;
  };
}

// Basic types for OPF and NCX structures
interface OpfData {
  package: {
    metadata: {
      "dc:title": { _text: string };
      "dc:creator": { _text: string };
      [key: string]: any;
    };
    manifest: {
      item: ManifestItem[];
    };
    spine: {
      itemref: SpineItem[];
    };
  };
}

// Helper to find an element in a structure that might be an array or an object
function findElement(container: any, name: string) {
    if (!container) return undefined;
    const element = container[name];
    if (Array.isArray(element)) {
        return element[0];
    }
    return element;
}

const LICENSE_KEYWORDS = [
    'all rights reserved', 'public domain', 'creative commons', 'gutenberg',
    'copyright', 'license', 'terms of use', 'no cost and with almost no restrictions'
];

function isLicensingInfo(text: string): boolean {
    if (text.length > 2000) return false; // Avoid flagging long content sections
    const lowerText = text.toLowerCase();
    return LICENSE_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

// Parses HTML content to extract text lines
function parseHtmlContent(html: string, keyCounter: { value: number }): Paragraph[] {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    // Attempt to remove footnote links cleanly
    tempDiv.querySelectorAll('a[href^="#"]').forEach(a => {
        const sup = a.parentElement;
        if (sup?.tagName === 'SUP') {
            sup.remove();
        }
    });

    const paragraphs: Paragraph[] = [];
    const blockElements = Array.from(tempDiv.querySelectorAll("p, h1, h2, h3, h4, h5, h6, div, blockquote"));

    if (blockElements.length === 0) {
        // Handle case where content is not wrapped in block elements
        const text = tempDiv.textContent?.trim();
        if (text && !isLicensingInfo(text)) {
            text.split('\n\n').forEach(para => {
                if (para.trim()) {
                    paragraphs.push({ type: 'content', text: para.trim(), key: `para-${keyCounter.value++}` });
                }
            });
        }
        return paragraphs;
    }

    blockElements.forEach(el => {
        const text = el.textContent?.trim();
        if (text && !isLicensingInfo(text)) {
            let type: Paragraph['type'] = 'content';
            const tagName = el.tagName.toLowerCase();
            if (tagName.startsWith('h')) {
                const level = parseInt(tagName.substring(1), 10);
                type = level <= 2 ? 'title' : 'subtitle';
            }
            
            const className = el.getAttribute('class') || '';
            const style = el.getAttribute('style') || '';
            
            let paragraphClassName = '';
            if (className.includes('center') || style.includes('text-align: center')) {
                paragraphClassName = 'text-center';
            }
            if(tagName === 'blockquote'){
                paragraphClassName = 'pl-4 italic border-l-2 border-muted-foreground my-4';
            }

            paragraphs.push({ type, text, className: paragraphClassName, key: `para-${keyCounter.value++}` });
        } else if (!text && paragraphs.length > 0 && paragraphs[paragraphs.length - 1].type !== 'blank') {
            // Add blank line for spacing between elements, but not multiple in a row
            paragraphs.push({ type: 'blank', text: '', key: `para-${keyCounter.value++}` });
        }
    });

    return paragraphs;
}


export async function parseEpub(file: File): Promise<Omit<Book, "id" | "cover">> {
  const zip = await JSZip.loadAsync(file);
  const keyCounter = { value: 0 }; // Use an object to pass by reference

  // 1. Find and parse container.xml to get the path to the .opf file
  const containerFile = zip.file("META-INF/container.xml");
  if (!containerFile) throw new Error("META-INF/container.xml not found.");
  const containerXml = await containerFile.async("string");
  const containerJs: any = xml2js(containerXml, { compact: true });
  const opfPath = containerJs.container.rootfiles.rootfile._attributes["full-path"];
  const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/'));

  // 2. Parse the .opf file for metadata and manifest
  const opfFile = zip.file(opfPath);
  if (!opfFile) throw new Error(".opf file not found at: " + opfPath);
  const opfXml = await opfFile.async("string");
  const opfData: OpfData = xml2js(opfXml, { compact: true }) as OpfData;

  const metadata = opfData.package.metadata;
  const manifestItems = opfData.package.manifest.item;
  const spineItems = opfData.package.spine.itemref;

  const title = findElement(metadata, "dc:title")?._text || "Untitled";
  const author = findElement(metadata, "dc:creator")?._text || "Unknown Author";

  // 3. Create a map of manifest IDs to file paths
  const manifestMap = new Map<string, string>();
  manifestItems.forEach((item) => {
    manifestMap.set(item._attributes.id, item._attributes.href);
  });

  // 4. Read spine items in order and parse their content
  let bookContent: Paragraph[] = [];
  for (const spineItem of spineItems) {
    const idref = spineItem._attributes.idref;
    const href = manifestMap.get(idref);
    if (!href) continue;
    
    const contentPath = (opfDir ? `${opfDir}/` : '') + href;
    const contentFile = zip.file(contentPath);
    
    if (contentFile) {
        const htmlContent = await contentFile.async("string");
        const paragraphs = parseHtmlContent(htmlContent, keyCounter);
        if (bookContent.length > 0 && paragraphs.length > 0) {
            // Add a blank line between sections from different files if the previous section didn't end with one.
            if(bookContent[bookContent.length -1].type !== 'blank') {
                bookContent.push({ type: 'blank', text: '', key: `para-${keyCounter.value++}` });
            }
        }
        bookContent = bookContent.concat(paragraphs);
    }
  }

  return { title, author, content: bookContent };
}
