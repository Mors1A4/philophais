
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useBooks } from "@/hooks/use-books";
import { useAuthRedirect } from "@/hooks/use-auth";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Paragraph } from "@/lib/types";

interface ReaderClientProps {
  bookId: string;
}

const getParagraphClassName = (type: string, additionalClass?: string) => {
  let baseClasses = 'my-0';
  switch (type) {
    case 'title':
      baseClasses += ' text-3xl font-bold font-headline mt-8 mb-4';
      break;
    case 'subtitle':
      baseClasses += ' text-xl font-semibold font-headline mt-6 mb-3 text-muted-foreground';
      break;
    default:
      baseClasses += ' my-0'; // Default content style
      break;
  }
  return `${baseClasses} ${additionalClass || ''}`.trim();
}

export function ReaderClient({ bookId }: ReaderClientProps) {
  useAuthRedirect(true);
  const { getBookById } = useBooks();
  const book = getBookById(bookId);

  const [pages, setPages] = useState<Paragraph[][]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isPaginating, setIsPaginating] = useState(true);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);

  const paginate = useCallback(() => {
    if (!book || !pageContainerRef.current) return;
    
    setIsPaginating(true);
    
    // Use a timeout to ensure the DOM has updated with the new container height
    setTimeout(() => {
        if (!pageContainerRef.current) return;
        const containerHeight = pageContainerRef.current.clientHeight;
        const newPages: Paragraph[][] = [];
        let currentPageContent: Paragraph[] = [];
        let currentHeight = 0;

        // Create a temporary hidden div to measure paragraph heights
        const measurer = document.createElement('div');
        measurer.style.position = 'absolute';
        measurer.style.visibility = 'hidden';
        measurer.style.width = `${pageContainerRef.current.clientWidth}px`;
        document.body.appendChild(measurer);
        
        const firstContentIndex = book.content.findIndex(p => p.type !== 'title' && p.type !== 'subtitle');
        const contentToDisplay = firstContentIndex === -1 ? book.content : book.content.slice(firstContentIndex);


        contentToDisplay.forEach(p => {
            const paraElement = document.createElement('p');
            paraElement.className = getParagraphClassName(p.type, p.className);
            paraElement.innerText = p.text || ' '; // Use non-empty space for blank lines to measure height
            
            measurer.appendChild(paraElement);
            const paraHeight = paraElement.offsetHeight;
            
            // Add extra height for the margin-bottom of content paragraphs
            const marginHeight = p.type === 'content' ? 16 : 0; 
            const totalParaHeight = paraHeight + marginHeight;

            if (currentHeight + totalParaHeight > containerHeight && currentPageContent.length > 0) {
                newPages.push(currentPageContent);
                currentPageContent = [p];
                currentHeight = totalParaHeight;
            } else {
                currentPageContent.push(p);
                currentHeight += totalParaHeight;
            }
            measurer.removeChild(paraElement);
        });

        if (currentPageContent.length > 0) {
            newPages.push(currentPageContent);
        }
        
        document.body.removeChild(measurer);

        setPages(newPages);
        setCurrentPage(0);
        setIsPaginating(false);
    }, 100);

  }, [book]);

  useEffect(() => {
    paginate();
    window.addEventListener('resize', paginate);
    return () => window.removeEventListener('resize', paginate);
  }, [paginate]);


  if (!book) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
        <p>Book not found.</p>
        <Button asChild>
            <Link href="/library">Back to Library</Link>
        </Button>
      </div>
    );
  }

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, pages.length - 1));
  };

  const goToPrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 0));
  };

  return (
    <div className="flex h-screen w-full flex-col">
       <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm md:px-8">
        <div className="flex flex-col overflow-hidden">
            <h1 className="font-headline text-xl font-bold truncate">{book.title}</h1>
            <p className="text-sm text-muted-foreground truncate">{book.author}</p>
        </div>
        <Button asChild variant="ghost">
          <Link href="/library">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Library
          </Link>
        </Button>
      </header>
      
      <main ref={pageContainerRef} className="flex-1 overflow-hidden prose prose-lg dark:prose-invert mx-auto max-w-3xl w-full p-4 md:p-8 relative">
        {isPaginating ? (
           <div className="absolute inset-0 flex items-center justify-center">
             <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
             <span className="ml-2">Calculating pages...</span>
           </div>
        ) : (
          <div ref={contentRef}>
            {pages[currentPage] && pages[currentPage].map((p) => {
              if (p.type === 'blank') {
                return <div key={p.key} className="h-4"></div>;
              }
              return (
                <React.Fragment key={p.key}>
                  <p className={getParagraphClassName(p.type, p.className)}>
                    {p.text}
                  </p>
                  {p.type === 'content' && <div className="h-4"></div>}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </main>

       <footer className="shrink-0 flex items-center justify-center gap-4 border-t p-2">
            <Button variant="ghost" size="icon" onClick={goToPrevPage} disabled={currentPage === 0 || isPaginating}>
                <ChevronLeft />
            </Button>
            <span className="text-sm text-muted-foreground font-mono">
                Page {isPaginating ? '-' : currentPage + 1} of {isPaginating ? '-' : pages.length}
            </span>
            <Button variant="ghost" size="icon" onClick={goToNextPage} disabled={currentPage >= pages.length - 1 || isPaginating}>
                <ChevronRight />
            </Button>
       </footer>
    </div>
  );
}
