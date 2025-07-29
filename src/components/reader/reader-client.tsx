"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useBooks } from "@/hooks/use-books";
import { useAuthRedirect } from "@/hooks/use-auth";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Paragraph, AnswerQuestionInput, AnswerQuestionOutput } from "@/lib/types";
import { Textarea } from "@/components/ui/textarea";
import { answerQuestion } from "@/ai/flows/q-and-a-flow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";

interface ReaderClientProps {
  bookId: string;
}

const getParagraphClassName = (type: string, additionalClass?: string) => {
  let baseClasses = 'my-0 text-left';
  switch (type) {
    case 'title':
      baseClasses += ' text-3xl font-bold font-headline mt-8 mb-4';
      break;
    case 'subtitle':
      baseClasses += ' text-xl font-semibold font-headline mt-6 mb-3 text-muted-foreground';
      break;
    default:
      break;
  }
  return `${baseClasses} ${additionalClass || ''}`.trim();
};

export function ReaderClient({ bookId }: ReaderClientProps) {
  useAuthRedirect(true);
  const { getBookById } = useBooks();
  const book = getBookById(bookId);
  const { toast } = useToast();

  const [pages, setPages] = useState<Paragraph[][]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isPaginating, setIsPaginating] = useState(true);
  
  const [question, setQuestion] = useState("");
  const [qaResult, setQaResult] = useState<AnswerQuestionOutput | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [accordionValue, setAccordionValue] = useState<string | undefined>();
  
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLElement>(null);

  const paginate = useCallback(() => {
    if (!book || !pageContainerRef.current || !headerRef.current || !footerRef.current) return;
    
    setIsPaginating(true);
    
    setTimeout(() => {
      const pageContainer = pageContainerRef.current;
      const header = headerRef.current;
      const footer = footerRef.current;
      if (!pageContainer || !header || !footer) return;

      const pageContainerStyle = window.getComputedStyle(pageContainer);
      const pageContainerPaddingY = parseFloat(pageContainerStyle.paddingTop) + parseFloat(pageContainerStyle.paddingBottom);
      
      const containerHeight = window.innerHeight - header.offsetHeight - footer.offsetHeight - pageContainerPaddingY;
      const containerWidth = pageContainer.clientWidth;

      const measurer = document.createElement('div');
      measurer.style.position = 'absolute';
      measurer.style.visibility = 'hidden';
      measurer.style.width = `${containerWidth}px`;
      measurer.className = pageContainer.className;
      measurer.classList.remove('flex-1', 'overflow-hidden', 'relative');
      document.body.appendChild(measurer);

      const splitTextToFit = (text: string, maxHeight: number, p: Paragraph) => {
        const paraElement = document.createElement('p');
        paraElement.className = getParagraphClassName(p.type, p.className);
        measurer.appendChild(paraElement);
        const words = text.split(' ');
        let low = 0, high = words.length, fitIndex = 0;
        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          paraElement.innerText = words.slice(0, mid).join(' ') || ' ';
          if (paraElement.offsetHeight <= maxHeight) {
            fitIndex = mid; low = mid + 1;
          } else {
            high = mid - 1;
          }
        }
        measurer.removeChild(paraElement);
        return {
          fittingText: words.slice(0, fitIndex).join(' '),
          leftoverText: words.slice(fitIndex).join(' ')
        };
      };
      
      const newPages: Paragraph[][] = [];
      let currentPageParas: Paragraph[] = [];
      let currentHeight = 0;
      
      const finalizePage = () => {
        if (currentPageParas.length > 0) newPages.push(currentPageParas);
        currentPageParas = [];
        currentHeight = 0;
      };

      for (const p of book.content) {
        const paraElement = document.createElement('p');
        paraElement.className = getParagraphClassName(p.type, p.className);
        paraElement.innerText = p.text || ' ';
        measurer.appendChild(paraElement);
        const style = window.getComputedStyle(paraElement);
        const marginTop = parseFloat(style.marginTop);
        const marginBottom = parseFloat(style.marginBottom);
        let paraHeight = paraElement.offsetHeight + marginTop + marginBottom;
        if (p.type === 'content') {
            paraHeight += 16;
        }
        measurer.removeChild(paraElement);

        if (paraHeight > containerHeight && p.text) {
          finalizePage();
          let textToProcess = p.text;
          while (textToProcess) {
            const { fittingText, leftoverText } = splitTextToFit(textToProcess, containerHeight, p);
            if (!fittingText && leftoverText) break;
            currentPageParas.push({ ...p, text: fittingText, key: `${p.key}-part-${newPages.length}` });
            finalizePage();
            textToProcess = leftoverText;
          }
          continue;
        }

        if (currentHeight + paraHeight > containerHeight) {
          finalizePage();
        }

        currentPageParas.push(p);
        currentHeight += paraHeight;
      }

      finalizePage();
      document.body.removeChild(measurer);
      setPages(newPages);
      setCurrentPage(0);
      setIsPaginating(false);
    }, 100);
  }, [book]);

  const handleAskQuestion = async () => {
    if (!question.trim() || !pages[currentPage]) return;
    
    setIsAsking(true);
    setQaResult(null);
    setAccordionValue("qa-result");

    try {
      const pageContent = pages[currentPage].map(p => p.text).join('\n\n');
      const input: AnswerQuestionInput = { question, pageContent };
      const result = await answerQuestion(input);
      setQaResult(result);
    } catch (error) {
      console.error("Error asking question:", error);
      toast({
        variant: "destructive",
        title: "AI Error",
        description: "Could not get an answer from the assistant. Please try again.",
      });
      setAccordionValue(undefined);
    } finally {
      setIsAsking(false);
    }
  };

  useEffect(() => {
    paginate();
    window.addEventListener('resize', paginate);
    return () => window.removeEventListener('resize', paginate);
  }, [paginate]);

  if (!book) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
        <p>Book not found.</p>
        <Button asChild><Link href="/library">Back to Library</Link></Button>
      </div>
    );
  }

  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, pages.length - 1));
  const goToPrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 0));

  return (
    <div className="flex h-screen w-full flex-col">
      <header ref={headerRef} className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm md:px-8">
        <div className="flex flex-col overflow-hidden">
          <h1 className="font-headline text-xl font-bold truncate">{book.title}</h1>
          <p className="text-sm text-muted-foreground truncate">{book.author}</p>
        </div>
        <Button asChild variant="ghost">
          <Link href="/library"><ArrowLeft className="mr-2 h-4 w-4" />Back to Library</Link>
        </Button>
      </header>
      
      <main ref={pageContainerRef} className="flex-1 overflow-hidden prose prose-lg dark:prose-invert mx-auto max-w-3xl w-full p-4 md:p-8 relative">
        {isPaginating ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2">Calculating pages...</span>
          </div>
        ) : (
          <div>
            {pages[currentPage]?.map((p) => {
              if (p.type === 'blank') return <div key={p.key} className="h-4"></div>;
              return (
                <React.Fragment key={p.key}>
                  <p className={getParagraphClassName(p.type, p.className)}>{p.text}</p>
                  {p.type === 'content' && <div className="h-4" />}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </main>
      
      <footer ref={footerRef} className="shrink-0 border-t">
        <Accordion type="single" collapsible value={accordionValue} onValueChange={setAccordionValue} className="w-full">
          <AccordionItem value="qa-result" className="border-b-0">
             <div className="w-full max-w-3xl mx-auto p-2">
                <AccordionContent>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg font-headline">Assistant's Answer</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {isAsking && <p className="text-muted-foreground">Thinking...</p>}
                        {qaResult && <p className="prose prose-sm dark:prose-invert max-w-none">{qaResult.answer}</p>}
                      </CardContent>
                    </Card>
                </AccordionContent>
                <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="outline" size="icon" onClick={goToPrevPage} disabled={currentPage === 0 || isPaginating}>
                        <ChevronLeft />
                      </Button>
                      <span className="text-sm text-muted-foreground font-mono w-24 text-center">
                        {isPaginating ? '...' : `Page ${currentPage + 1}/${pages.length}`}
                      </span>
                      <Button variant="outline" size="icon" onClick={goToNextPage} disabled={currentPage >= pages.length - 1 || isPaginating}>
                        <ChevronRight />
                      </Button>
                    </div>
                    <Textarea
                      placeholder="Ask a question about this page..."
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      className="text-base"
                      rows={1}
                    />
                    <AccordionTrigger asChild>
                         <Button onClick={handleAskQuestion} disabled={isAsking || !question.trim()} className="bg-accent text-accent-foreground hover:bg-accent/90">
                          {isAsking ? <Loader2 className="animate-spin" /> : <Sparkles />}
                          <span className="sr-only">Ask</span>
                        </Button>
                    </AccordionTrigger>
                </div>
             </div>
          </AccordionItem>
        </Accordion>
      </footer>
    </div>
  );
}
