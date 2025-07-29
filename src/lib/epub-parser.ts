// src/lib/epub-parser.ts

import JSZip from "jszip";
import { xml2js } from "xml-js";
import type { Book, Paragraph } from "./types";

// Helper interfaces for parsing the EPUB's structure files
interface ManifestItem {
  _attributes: { id: string; href: string; "media-type": string; };
}
interface SpineItem {
  _attributes: { idref: string; };
}
interface OpfData {
  package: {
    metadata: { "dc:title": { _text: string }; "dc:creator": { _text: string }; [key: string]: any; };
    manifest: { item: ManifestItem[]; };
    spine: { itemref: SpineItem[]; };
  };
}

// Keywords to identify and filter out licensing/legal text
const LICENSE_KEYWORDS = [
    'all rights reserved', 'public domain', 'creative commons', 'gutenberg',
    'copyright', 'license', 'terms of use', 'no cost and with almost no restrictions',
    'disclaimer', 'warranty', 'indemnify', 'limitation of liability'
];

/**
 * Checks if a piece of text is likely licensing or legal information.
 */
function isLicensingInfo(text: string): boolean {
    const lowerText = text.toLowerCase();
    // Return true if any of the keywords are found in the text
    return LICENSE_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

/**
 * Parses an HTML string from the EPUB and extracts content into structured paragraphs.
 */
function parseHtmlContent(html: string, keyCounter: { value: number }): Paragraph[] {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    // Clean up footnote links, which can clutter the reading experience
    tempDiv.querySelectorAll('a[href^="#"]').forEach(a => {
        const sup = a.parentElement;
        if (sup?.tagName === 'SUP') {
            sup.remove();
        }
    });

    const paragraphs: Paragraph[] = [];
    // A single selector for all block-level elements we care about
    const blockSelector = "p, h1, h2, h3, h4, h5, h6, div, blockquote";
    const blockElements = Array.from(tempDiv.querySelectorAll(blockSelector));

    // Fallback for content that isn't wrapped in block elements
    if (blockElements.length === 0 && tempDiv.textContent) {
        const text = tempDiv.textContent.trim();
        if (text && !isLicensingInfo(text)) {
            // Split by double newlines to simulate paragraphs
            text.split('\n\n').forEach(paraText => {
                if (paraText.trim()) {
                    paragraphs.push({ type: 'content', text: paraText.trim(), key: `para-${keyCounter.value++}` });
                }
            });
        }
        return paragraphs;
    }

    // Process each block element
    blockElements.forEach(el => {
        // Skip elements that contain other block elements to prevent duplication.
        if (el.querySelector(blockSelector)) {
            return;
        }

        const text = el.textContent?.trim();

        if (text && !isLicensingInfo(text)) {
            let type: Paragraph['type'] = 'content';
            const tagName = el.tagName.toLowerCase();

            // Determine paragraph type (title, subtitle, etc.) based on heading level
            if (tagName.startsWith('h')) {
                const level = parseInt(tagName.substring(1), 10);
                type = level <= 2 ? 'title' : 'subtitle';
            }
            
            // Assign specific styling classes based on tag or element attributes
            let className = '';
            if (el.getAttribute('class')?.includes('center') || el.getAttribute('style')?.includes('text-align: center')) {
                className = 'text-center';
            }
            if(tagName === 'blockquote'){
                className = 'pl-4 italic border-l-2 border-muted-foreground my-4';
            }

            paragraphs.push({ type, text, className, key: `para-${keyCounter.value++}` });
        } else if (!text && paragraphs.length > 0 && paragraphs[paragraphs.length - 1].type !== 'blank') {
            // Add a blank paragraph for spacing, but avoid multiple blanks in a row
            paragraphs.push({ type: 'blank', text: '', key: `para-${keyCounter.value++}` });
        }
    });

    return paragraphs;
}


/**
 * Main function to parse an EPUB file.
 * It unzips the file, reads the metadata, and processes the content files in order.
 */
export async function parseEpub(file: File): Promise<Omit<Book, "id" | "cover">> {
  const zip = await JSZip.loadAsync(file);
  const keyCounter = { value: 0 }; // Use an object to pass by reference for a unique key

  // 1. Find and parse container.xml to get the path to the main .opf file
  const containerFile = zip.file("META-INF/container.xml");
  if (!containerFile) throw new Error("META-INF/container.xml not found.");
  const containerXml = await containerFile.async("string");
  const containerJs: any = xml2js(containerXml, { compact: true });
  const opfPath = containerJs.container.rootfiles.rootfile._attributes["full-path"];
  const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/'));

  // 2. Parse the .opf file for metadata (title, author) and the book's structure
  const opfFile = zip.file(opfPath);
  if (!opfFile) throw new Error(`.opf file not found at: ${opfPath}`);
  const opfXml = await opfFile.async("string");
  const opfData: OpfData = xml2js(opfXml, { compact: true }) as OpfData;

  const { metadata, manifest, spine } = opfData.package;
  const title = metadata["dc:title"]?._text || "Untitled";
  const author = metadata["dc:creator"]?._text || "Unknown Author";

  // 3. Create a map of manifest item IDs to their file paths
  const manifestMap = new Map<string, string>();
  manifest.item.forEach(item => {
    manifestMap.set(item._attributes.id, item._attributes.href);
  });

  // 4. Read the content files (spine) in order and parse their HTML
  let bookContent: Paragraph[] = [];
  for (const spineItem of spine.itemref) {
    const href = manifestMap.get(spineItem._attributes.idref);
    if (!href) continue;
    
    // Correctly handle relative paths from the .opf file
    const contentPath = (opfDir ? `${opfDir}/` : '') + href;
    const contentFile = zip.file(contentPath);
    
    if (contentFile) {
        const htmlContent = await contentFile.async("string");
        const paragraphs = parseHtmlContent(htmlContent, keyCounter);
        // Add a separator between chapter files for better spacing
        if (bookContent.length > 0 && paragraphs.length > 0 && bookContent[bookContent.length - 1].type !== 'blank') {
            bookContent.push({ type: 'blank', text: '', key: `para-${keyCounter.value++}` });
        }
        bookContent.push(...paragraphs);
    }
  }

  return { title, author, content: bookContent };
}
