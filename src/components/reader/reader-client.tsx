
"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useBooks } from "@/hooks/use-books";
import { useAuthRedirect } from "@/hooks/use-auth";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Save, Sparkles, Trash2, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Paragraph, AnswerQuestionInput, Book, Note } from "@/lib/types";
import { Textarea } from "@/components/ui/textarea";
import { answerQuestion } from "@/ai/flows/q-and-a-flow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useVisualViewportHeight } from "@/hooks/use-visual-viewport-height";
import { cn } from "@/lib/utils";

interface ReaderClientProps {
  bookId: string;
}

interface SelectionInfo {
  paragraphKey: string;
  startIndex: number;
  endIndex: number;
  text: string;
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
  useVisualViewportHeight();

  const { getBookById, updateBookProgress, addNote, deleteNote } = useBooks();
  const [book, setBook] = useState<Book | undefined>(undefined);
  const { toast } = useToast();

  const [pages, setPages] = useState<Paragraph[][]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isPaginating, setIsPaginating] = useState(true);
  const [isTurningPage, setIsTurningPage] = useState(false);
  
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState("");
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const [isResponseVisible, setIsResponseVisible] = useState(false);
  const [isAsking, setIsAsking] = useState(false);

  const [activeSelection, setActiveSelection] = useState<SelectionInfo | null>(null);
  const [isSavingNote, setIsSavingNote] = useState(false);
  
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const responseCardRef = useRef<HTMLDivElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const prevButtonRef = useRef<HTMLButtonElement>(null);

  const paginate = useCallback(() => {
    if (!book || !pageContainerRef.current) return;
    setIsPaginating(true);
    const pageContainer = pageContainerRef.current;
    const containerHeight = pageContainer.clientHeight;
    const containerWidth = pageContainer.clientWidth;
    const measurer = document.createElement('div');
    measurer.style.position = 'absolute';
    measurer.style.visibility = 'hidden';
    measurer.style.width = `${containerWidth}px`;
    measurer.className = pageContainer.className;
    measurer.classList.remove('flex-1', 'overflow-hidden', 'relative');
    document.body.appendChild(measurer);

    const newPages: Paragraph[][] = [];
    let currentPageParas: Paragraph[] = [];
    let currentHeight = 0;
    
    for (const p of book.content) {
      const paraElement = document.createElement('p');
      paraElement.className = getParagraphClassName(p.type, p.className);
      
      const pNotes = book.notes?.filter(n => n.paragraphKey === p.key).sort((a,b) => a.startIndex - b.startIndex) || [];
      let currentTextIndex = 0;
      let newHtml = '';
      pNotes.forEach(note => {
        newHtml += p.text.substring(currentTextIndex, note.startIndex);
        newHtml += `<span class="bg-accent/30" data-note-id="${note.id}">${p.text.substring(note.startIndex, note.endIndex)}</span>`;
        currentTextIndex = note.endIndex;
      });
      newHtml += p.text.substring(currentTextIndex);
      paraElement.innerHTML = newHtml || ' ';

      measurer.appendChild(paraElement);
      const style = window.getComputedStyle(paraElement);
      const marginTop = parseFloat(style.marginTop);
      const marginBottom = parseFloat(style.marginBottom);
      const paraHeight = paraElement.offsetHeight + marginTop + marginBottom + (p.type === 'content' ? 16 : 0);
      measurer.removeChild(paraElement);

      if (currentHeight + paraHeight > containerHeight && currentPageParas.length > 0) {
        newPages.push(currentPageParas);
        currentPageParas = [];
        currentHeight = 0;
      }
      currentPageParas.push(p);
      currentHeight += paraHeight;
    }

    if (currentPageParas.length > 0) newPages.push(currentPageParas);
    
    document.body.removeChild(measurer);
    setPages(newPages);

    let startingPage = 0;
    if (book.lastReadParagraphKey) {
        const pageIndex = newPages.findIndex(page => page.find(p => p.key === book.lastReadParagraphKey));
        if (pageIndex !== -1) startingPage = pageIndex;
    }
    setCurrentPage(startingPage);
    setIsPaginating(false);
  }, [book]);

  useEffect(() => {
    const fetchBook = async () => {
      const bookData = await getBookById(bookId);
      setBook(bookData);
    };
    fetchBook();
  }, [bookId, getBookById]);
  
  useEffect(() => {
    if (book) {
        paginate();
    }
  }, [book, paginate]);

  const handleProgressUpdate = async (newPageIndex: number) => {
    if (!book || !pages[newPageIndex]) return;
    const paragraphKey = pages[newPageIndex]?.[0]?.key;
    if (paragraphKey && book.lastReadParagraphKey !== paragraphKey) {
      try {
        await updateBookProgress(book.id, paragraphKey);
      } catch (err) {
        console.error("Failed to update progress:", err);
        toast({ variant: "destructive", title: "Sync Error", description: "Could not save reading progress."});
      }
    }
  };

  const handleTextSelection = (event: React.MouseEvent | React.TouchEvent) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      if(activeSelection) {
        const isClickingTextarea = document.activeElement?.tagName === 'TEXTAREA';
        if (!isClickingTextarea) {
            setActiveSelection(null);
        }
      }
      return;
    }
  
    // On touch devices, prevent the default context menu from appearing.
    if (event.type === 'touchend' || event.type === 'touchcancel') {
      event.preventDefault();
    }

    const range = selection.getRangeAt(0);
    let container = range.commonAncestorContainer;
    
    if (container.nodeType === Node.TEXT_NODE) {
      container = container.parentElement!;
    }
    
    const paragraphEl = (container as HTMLElement).closest('p[data-paragraph-key]');
    if (!paragraphEl) {
      setActiveSelection(null);
      return;
    };
    
    const paragraphKey = paragraphEl.getAttribute('data-paragraph-key')!;
    
    const clone = range.cloneRange();
    clone.selectNodeContents(paragraphEl);
    clone.setEnd(range.startContainer, range.startOffset);
    const startIndex = clone.toString().length;
    
    const text = range.toString();
    const endIndex = startIndex + text.length;

    if (text.trim()) {
      setActiveSelection({ paragraphKey, startIndex, endIndex, text });
      setQuestion("");
    }
    
    selection.removeAllRanges();
  };

  const handleSaveNote = async () => {
    if (!activeSelection || !question.trim() || !book) return;
    setIsSavingNote(true);
    const note: Note = {
      id: `note-${Date.now()}`,
      paragraphKey: activeSelection.paragraphKey,
      startIndex: activeSelection.startIndex,
      endIndex: activeSelection.endIndex,
      text: question,
      selectedText: activeSelection.text,
    };
    try {
      await addNote(book.id, note);
      const updatedBook = { ...book, notes: [...(book.notes || []), note] };
      setBook(updatedBook);
      toast({ title: "Note saved!" });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not save note."});
    } finally {
      setIsSavingNote(false);
      setActiveSelection(null);
      setQuestion("");
    }
  };

  const handleDeleteNote = async (note: Note) => {
    if (!book) return;
    try {
      await deleteNote(book.id, note);
       const updatedBook = { ...book, notes: book.notes?.filter(n => n.id !== note.id) };
       setBook(updatedBook);
       toast({ title: "Note deleted." });
    } catch (error) {
       toast({ variant: "destructive", title: "Error", description: "Could not delete note."});
    }
  };

  const pageParaKeys = useMemo(() => {
    if (!pages[currentPage]) return new Set();
    return new Set(pages[currentPage].map(p => p.key));
  }, [pages, currentPage]);

  const renderParagraphWithHighlights = (p: Paragraph) => {
    if (!pageParaKeys.has(p.key)) return p.text;

    const notesInPara = book?.notes?.filter(n => n.paragraphKey === p.key) || [];
    const selection = (activeSelection?.paragraphKey === p.key) ? activeSelection : null;
    
    const marks = [
      ...notesInPara.map(n => ({...n, type: 'note'})),
      ...(selection ? [{...selection, type: 'selection'}] : [])
    ].sort((a, b) => a.startIndex - b.startIndex);

    if (marks.length === 0) return p.text;
    
    let lastIndex = 0;
    const segments: React.ReactNode[] = [];

    marks.forEach((mark, i) => {
      if (mark.startIndex > lastIndex) {
        segments.push(<React.Fragment key={`text-${i}`}>{p.text.substring(lastIndex, mark.startIndex)}</React.Fragment>);
      }

      const highlightedText = p.text.substring(mark.startIndex, mark.endIndex);

      if (mark.type === 'note') {
        segments.push(
          <Popover key={(mark as Note).id}>
            <PopoverTrigger asChild>
              <span className="bg-accent/30 cursor-pointer" data-note-id={(mark as Note).id}>
                {highlightedText}
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <p className="text-sm border-l-2 border-accent pl-2 italic">"{(mark as Note).selectedText}"</p>
                <p className="text-sm">{(mark as Note).text}</p>
                <Button variant="destructive" size="sm" onClick={() => handleDeleteNote(mark as Note)} className="w-full">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Note
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        );
      } else {
         segments.push(
           <span key="selection" className="bg-yellow-400/40">
             {highlightedText}
           </span>
         );
      }

      lastIndex = mark.endIndex;
    });

    if (lastIndex < p.text.length) {
      segments.push(<React.Fragment key="text-end">{p.text.substring(lastIndex)}</React.Fragment>);
    }
    
    return <>{segments}</>;
  };

  const handleAskQuestion = async () => {
    if (!question.trim() || !pages[currentPage]) {
      return;
    }

    setIsAsking(true);
    setLastResponse(null);
    setIsResponseVisible(true);

    const pageContent = pages[currentPage].map(p => p.text).join('\n\n');
    const input: AnswerQuestionInput = { question, pageContent, chatHistory };

    try {
      const response = await answerQuestion(input);
      const newHistory = `User: ${question}\nAssistant: ${response.answer}\n`;
      setChatHistory(prev => prev + newHistory);
      setLastResponse(response.answer);
    } catch (error) {
      console.error("Error asking question:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not get an answer from the assistant."});
      setLastResponse("Sorry, I couldn't get an answer. Please try again.");
    } finally {
      setIsAsking(false);
      setQuestion("");
    }
  };
  
  useEffect(() => {
    setChatHistory("");
    setLastResponse(null);
    setIsResponseVisible(false);
    setActiveSelection(null);
  }, [currentPage]);

  const changePage = async (direction: 'next' | 'prev') => {
    if (isTurningPage) return;
    setIsTurningPage(true);

    const newPage = direction === 'next' 
      ? Math.min(currentPage + 1, pages.length - 1)
      : Math.max(currentPage - 1, 0);

    if (newPage !== currentPage) {
      setCurrentPage(newPage);
      await handleProgressUpdate(newPage);
    }
    
    if (direction === 'next') nextButtonRef.current?.blur();
    else prevButtonRef.current?.blur();
    setIsTurningPage(false);
  };
  
  const goToNextPage = () => changePage('next');
  const goToPrevPage = () => changePage('prev');

  if (!book) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p>Loading book...</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col" style={{ height: 'var(--vh, 100vh)' }}>
      <header ref={headerRef} className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm md:px-8">
        <div className="flex flex-col overflow-hidden">
          <h1 className="font-headline text-xl font-bold truncate">{book.title}</h1>
          <p className="text-sm text-muted-foreground truncate">{book.author}</p>
        </div>
        <Button asChild variant="ghost">
          <Link href="/library"><ArrowLeft className="mr-2 h-4 w-4" />Back to Library</Link>
        </Button>
      </header>
      
      <main 
        ref={pageContainerRef} 
        className={cn(
          "flex-1 overflow-y-auto prose prose-lg dark:prose-invert mx-auto max-w-3xl w-full p-4 md:p-8 relative"
        )}
        onMouseUp={(e) => handleTextSelection(e)}
        onTouchEnd={(e) => handleTextSelection(e)}
        onTouchCancel={(e) => handleTextSelection(e)}
        onContextMenu={(e) => e.preventDefault()}
      >
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
                  <p className={getParagraphClassName(p.type, p.className)} data-paragraph-key={p.key}>
                    {renderParagraphWithHighlights(p)}
                  </p>
                  {p.type === 'content' && <div className="h-4" />}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </main>
      
      {isResponseVisible && (
        <div ref={responseCardRef} className="w-full max-w-3xl mx-auto p-4 pt-0 shrink-0">
          <Card className="relative shadow-lg">
            <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => setIsResponseVisible(false)}>
              <X className="h-4 w-4" />
            </Button>
            <CardHeader>
              <CardTitle className="text-lg font-headline flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                Assistant
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                  {lastResponse ?? <Loader2 className="animate-spin" />}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <footer ref={footerRef} className="shrink-0 border-t relative z-10">
        <div className="w-full max-w-3xl mx-auto p-2">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="flex items-center justify-center gap-2">
              <Button ref={prevButtonRef} variant="outline" size="icon" onClick={goToPrevPage} disabled={currentPage === 0 || isPaginating || isTurningPage}>
                <ChevronLeft />
              </Button>
              <span className="text-sm text-muted-foreground font-mono w-24 text-center">
                {isPaginating ? '...' : `Page ${currentPage + 1}/${pages.length}`}
              </span>
              <Button ref={nextButtonRef} variant="outline" size="icon" onClick={goToNextPage} disabled={currentPage >= pages.length - 1 || isPaginating || isTurningPage}>
                <ChevronRight />
              </Button>
            </div>
            <div className="w-full flex items-center gap-2">
              <Textarea
                placeholder={activeSelection ? "Add a note to your highlight..." : "Ask a question about this page..."}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if(activeSelection) handleSaveNote(); else handleAskQuestion();
                  }
                }}
                className="text-base min-h-[40px] resize-none"
                rows={1}
              />
              {activeSelection ? (
                 <Button onClick={handleSaveNote} disabled={isSavingNote || !question.trim()} className="bg-accent text-accent-foreground hover:bg-accent/90">
                    {isSavingNote ? <Loader2 className="animate-spin" /> : <Save />}
                    <span className="sr-only">Save Note</span>
                  </Button>
              ) : (
                <Button onClick={handleAskQuestion} disabled={isAsking || !question.trim()} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  {isAsking ? <Loader2 className="animate-spin" /> : <Sparkles />}
                  <span className="sr-only">Ask</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
