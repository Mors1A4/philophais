"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useAuthRedirect } from "@/hooks/use-auth";
import { useBooks } from "@/hooks/use-books";
import type { Book, Line } from "@/lib/types";
import { AIAssistant } from "./ai-assistant";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const LINE_HEIGHT_EM = 1.6;
const FONT_SIZE_PX = 18;
const LINE_WEIGHTS = {
  title: 3,
  subtitle: 2,
  content: 1,
  blank: 1,
};

export function ReaderClient({ bookId }: { bookId: string }) {
  const authStatus = useAuthRedirect(true);
  const { getBookById } = useBooks();

  const [book, setBook] = useState<Book | null>(null);
  const [pages, setPages] = useState<Line[][]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isPaginating, setIsPaginating] = useState(true);

  const contentRef = useRef<HTMLDivElement>(null);

  const calculatePages = useCallback(() => {
    if (!book || !contentRef.current) return;

    setIsPaginating(true);

    setTimeout(() => {
        if (!contentRef.current) {
            setIsPaginating(false);
            return;
        };

        const containerHeight = contentRef.current.clientHeight;
        const singleLineHeight = FONT_SIZE_PX * LINE_HEIGHT_EM;
        const linesPerScreen = Math.floor(containerHeight / singleLineHeight);

        if (linesPerScreen <= 0) {
            setIsPaginating(false);
            return;
        };
        
        const newPages: Line[][] = [];
        let currentPageLines: Line[] = [];
        let currentWeight = 0;
        const allLines = book.content;

        let i = 0;
        while (i < allLines.length) {
          const currentLine = allLines[i];
          const lineWeight = LINE_WEIGHTS[currentLine.type] || 1;

          // Check for paragraph integrity
          if (currentLine.paragraphId) {
            const isParagraphStart = i === 0 || allLines[i-1].paragraphId !== currentLine.paragraphId;
            
            if (isParagraphStart) {
              const paragraphLines = allLines.filter(l => l.paragraphId === currentLine.paragraphId);
              const paragraphWeight = paragraphLines.reduce((acc, l) => acc + (LINE_WEIGHTS[l.type] || 1), 0);
              
              if (currentWeight + paragraphWeight > linesPerScreen && currentWeight > 0) {
                // Not enough space for the new paragraph, so start a new page
                newPages.push(currentPageLines);
                currentPageLines = [];
                currentWeight = 0;
              }

              // If the whole paragraph is too big for a single page, we have to split it.
              // But for now, we assume paragraphs fit on one page.
              for (const pLine of paragraphLines) {
                const pLineWeight = LINE_WEIGHTS[pLine.type] || 1;
                if (currentWeight + pLineWeight > linesPerScreen && currentPageLines.length > 0) {
                  newPages.push(currentPageLines);
                  currentPageLines = [];
                  currentWeight = 0;
                }
                currentPageLines.push(pLine);
                currentWeight += pLineWeight;
              }
              i += paragraphLines.length;
              continue;
            }
          }
          
          // Fallback for lines without paragraphId or if logic is midway
          if (currentWeight + lineWeight > linesPerScreen && currentPageLines.length > 0) {
              newPages.push(currentPageLines);
              currentPageLines = [];
              currentWeight = 0;
          }

          currentPageLines.push(currentLine);
          currentWeight += lineWeight;
          i++;
        }

        if (currentPageLines.length > 0) {
            newPages.push(currentPageLines);
        }

        setPages(newPages);
        
        setCurrentPage(prev => {
            const newTotalPages = newPages.length || 1;
            return Math.max(1, Math.min(prev, newTotalPages));
        });

        setIsPaginating(false);
    }, 100);

  }, [book]);


  useEffect(() => {
    const foundBook = getBookById(bookId);
    if (foundBook) {
      setBook(foundBook);
    }
  }, [bookId, getBookById]);
  
  useEffect(() => {
    calculatePages();
    window.addEventListener("resize", calculatePages);
    return () => window.removeEventListener("resize", calculatePages);
  }, [calculatePages]);

  const currentContent = useMemo(() => {
    if (pages.length > 0) {
      return pages[currentPage - 1] || [];
    }
    return [];
  }, [pages, currentPage]);

  const pageContentForAI = useMemo(() => {
    return currentContent.map(line => line.text).join('\n');
  }, [currentContent]);


  if (authStatus === "loading" || !book) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading your book...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen max-h-screen flex-col bg-background">
      <header className="flex h-16 flex-shrink-0 items-center justify-between border-b px-4 md:px-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/library">
            <ChevronLeft className="mr-2 h-4 w-4" />
            <span className="font-headline">Back to Library</span>
          </Link>
        </Button>
        <div className="text-center">
            <h1 className="font-headline truncate text-lg font-bold">{book.title}</h1>
            {pages.length > 0 && (
                <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {pages.length}
                </p>
            )}
        </div>
        <div className="w-32"></div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex h-full max-w-4xl flex-col p-4 md:p-8">
            <div ref={contentRef} className="relative flex-1">
                {isPaginating ? (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-muted-foreground">Calculating pages...</p>
                    </div>
                ) : (
                    <div className="prose prose-lg dark:prose-invert max-w-none" style={{fontSize: `${FONT_SIZE_PX}px`, lineHeight: `${LINE_HEIGHT_EM}em`}}>
                        {currentContent.map((line, index) => {
                            const lineProps = {
                              className: cn(line.className)
                            };
                            switch (line.type) {
                                case 'title':
                                    return <h1 key={index} {...lineProps} className={cn("font-headline !mb-2 !text-4xl", line.className)}>{line.text}</h1>;
                                case 'subtitle':
                                    return <h2 key={index} {...lineProps} className={cn("!mt-0 !text-2xl text-muted-foreground", line.className)}>{line.text}</h2>;
                                case 'blank':
                                    return <div key={index} {...lineProps} className={cn("h-[1em]", line.className)}></div>;
                                default:
                                    return <p key={index} {...lineProps} className={cn("!my-0", line.className)}>{line.text}</p>;
                            }
                        })}
                    </div>
                )}
            </div>

            <div className="mt-4 flex-shrink-0 justify-between">
                <div className="flex items-center justify-center gap-4">
                    <Button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage <= 1 || isPaginating} variant="outline" className="font-headline">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                    </Button>
                    <Button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= pages.length || isPaginating} variant="outline" className="font-headline">
                        Next <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
      </main>

      <footer className="flex-shrink-0 border-t bg-background/80 backdrop-blur-sm">
        <AIAssistant bookName={book.title} pageContent={pageContentForAI} />
      </footer>
    </div>
  );
}
