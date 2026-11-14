import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useBooks } from "@/hooks/use-books";
import { ArrowLeft, ChevronLeft, ChevronRight, Copy, Loader2, Save, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Paragraph, AnswerQuestionInput, Book, Note, NoteColor } from "@/lib/types";
import { Textarea } from "@/components/ui/textarea";
import { askGeminiQuestion } from "@/lib/gemini";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useVisualViewportHeight } from "@/hooks/use-visual-viewport-height";
import { cn } from "@/lib/utils";
import { NOTE_COLORS } from "@/lib/types";

interface ReaderClientProps {
  bookId: string;
  onBack: () => void;
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
      baseClasses += ' text-2xl sm:text-3xl font-bold font-headline mt-6 mb-3';
      break;
    case 'subtitle':
      baseClasses += ' text-lg sm:text-xl font-semibold font-headline mt-4 mb-2 text-muted-foreground';
      break;
    default:
      break;
  }
  return `${baseClasses} ${additionalClass || ''}`.trim();
};

const noteColorClasses: Record<NoteColor, string> = {
  yellow: "text-yellow-500",
  red: "text-red-500",
  green: "text-green-500",
  blue: "text-blue-500",
  purple: "text-purple-500",
};

const noteColorRingClasses: Record<NoteColor, string> = {
  yellow: "ring-yellow-500",
  red: "ring-red-500",
  green: "ring-green-500",
  blue: "ring-blue-500",
  purple: "ring-purple-500",
};

const noteColorBgClasses: Record<NoteColor, string> = {
  yellow: "bg-yellow-500",
  red: "bg-red-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
};

export function ReaderClient({ bookId, onBack }: ReaderClientProps) {
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
  const [selectedColor, setSelectedColor] = useState<NoteColor>('yellow');
  
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
        newHtml += `<span class="${noteColorClasses[note.color]}" data-note-id="${note.id}">${p.text.substring(note.startIndex, note.endIndex)}</span>`;
        currentTextIndex = note.endIndex;
      });
      newHtml += p.text.substring(currentTextIndex);
      paraElement.innerHTML = newHtml || ' ';

      measurer.appendChild(paraElement);
      const style = window.getComputedStyle(paraElement);
      const marginTop = parseFloat(style.marginTop) || 0;
      const marginBottom = parseFloat(style.marginBottom) || 0;
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
    if (book && !pages.length) {
        paginate();
    }
  }, [book, pages.length, paginate]);

  const handleProgressUpdate = async (newPageIndex: number) => {
    if (!book || !pages[newPageIndex]) return;
    const paragraphKey = pages[newPageIndex]?.[0]?.key;
    if (paragraphKey && book.lastReadParagraphKey !== paragraphKey) {
      try {
        await updateBookProgress(book.id, paragraphKey);
      } catch (err) {
        console.error("Failed to update progress:", err);
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
      color: selectedColor,
    };
    try {
      await addNote(book.id, note);
      const updatedBook = { ...book, notes: [...(book.notes || []), note] };
      setBook(updatedBook);
      toast({ title: "Note saved!" });
      setActiveSelection(null);
      setQuestion("");
    } catch (error) {
      console.error("Failed to save note:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not save the note." });
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteToDelete: Note) => {
    if (!book) return;
    try {
      await deleteNote(book.id, noteToDelete);
      const updatedNotes = book.notes?.filter(n => n.id !== noteToDelete.id);
      setBook({ ...book, notes: updatedNotes });
      toast({ title: "Note deleted." });
    } catch (error) {
      console.error("Failed to delete note:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not delete the note." });
    }
  };

  const renderParagraphWithHighlights = (p: Paragraph) => {
    if (!book?.notes) return p.text;

    const pNotes = book.notes
      .filter((n) => n.paragraphKey === p.key)
      .sort((a, b) => a.startIndex - b.startIndex);

    if (pNotes.length === 0) return p.text;

    const segments = [];
    let lastIndex = 0;

    pNotes.forEach((note) => {
      if (note.startIndex > lastIndex) {
        segments.push(
          <React.Fragment key={`text-${lastIndex}`}>
            {p.text.substring(lastIndex, note.startIndex)}
          </React.Fragment>
        );
      }

      segments.push(
        <Popover key={note.id}>
          <PopoverTrigger asChild>
            <span
              className={cn(
                "cursor-pointer rounded-sm px-0.5 transition-colors underline decoration-2 underline-offset-2",
                noteColorClasses[note.color]
              )}
            >
              {p.text.substring(note.startIndex, note.endIndex)}
            </span>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="start">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Note
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteNote(note)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-xs italic text-muted-foreground">&quot;{note.selectedText}&quot;</p>
              <p className="text-sm font-medium">{note.text}</p>
            </div>
          </PopoverContent>
        </Popover>
      );

      lastIndex = note.endIndex;
    });

    if (lastIndex < p.text.length) {
      segments.push(
        <React.Fragment key="text-end">
          {p.text.substring(lastIndex)}
        </React.Fragment>
      );
    }

    return <>{segments}</>;
  };

  const handleAskQuestion = async () => {
    if (!question.trim() || !pages[currentPage] || !book) {
      return;
    }

    setIsAsking(true);
    setLastResponse(null);
    setIsResponseVisible(true);

    const pageContent = pages[currentPage].map(p => p.text).join('\n\n');
    const input: AnswerQuestionInput = {
      question,
      pageContent,
      bookTitle: book.title,
      bookAuthor: book.author,
      chatHistory,
    };

    try {
      const response = await askGeminiQuestion(input);
      const newHistory = `User: ${question}\nAssistant: ${response.answer}\n`;
      setChatHistory(prev => prev + newHistory);
      setLastResponse(response.answer);
    } catch (error) {
      console.error("Error asking question:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not get an answer from the assistant." });
      setLastResponse("The AI assistant encountered an issue. Please try again.");
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
    setTimeout(() => setIsTurningPage(false), 200);
  };

  if (!book) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 font-headline">Loading book from device storage...</span>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col min-h-screen bg-background text-foreground select-text">
      <header ref={headerRef} className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-8">
        <div className="flex flex-col overflow-hidden max-w-[70%]">
          <h1 className="font-headline text-base sm:text-lg font-bold truncate">{book.title}</h1>
          <p className="text-xs text-muted-foreground truncate">{book.author}</p>
        </div>
        <Button onClick={onBack} variant="ghost" size="sm" className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Library</span>
        </Button>
      </header>

      <main
        ref={pageContainerRef}
        className={cn(
          "flex-1 overflow-y-auto prose prose-lg dark:prose-invert mx-auto max-w-3xl w-full p-4 md:p-8 relative no-native-selection-callout"
        )}
        onMouseUp={(e) => handleTextSelection(e)}
        onTouchEnd={(e) => handleTextSelection(e)}
      >
        {isPaginating ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2">Formatting pages...</span>
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
                </React.Fragment>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Action Menu for Selected Text */}
      {activeSelection && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-lg rounded-xl border bg-card/95 p-3 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Selected: &quot;{activeSelection.text.substring(0, 30)}...&quot;
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setActiveSelection(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-muted-foreground">Color:</span>
            {NOTE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedColor(c)}
                className={cn(
                  "h-5 w-5 rounded-full transition-transform",
                  noteColorBgClasses[c],
                  selectedColor === c ? "ring-2 ring-foreground scale-110" : "opacity-70 hover:opacity-100"
                )}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <Textarea
              placeholder="Add your note or question about this passage..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="min-h-[60px] text-xs resize-none"
            />
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleAskQuestion}
              disabled={isAsking || !question.trim()}
              className="gap-1.5 text-xs"
            >
              {isAsking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Ask AI
            </Button>
            <Button
              size="sm"
              onClick={handleSaveNote}
              disabled={isSavingNote || !question.trim()}
              className="gap-1.5 text-xs"
            >
              {isSavingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Note
            </Button>
          </div>
        </div>
      )}

      {/* AI Response Card */}
      {isResponseVisible && lastResponse && (
        <div
          ref={responseCardRef}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-lg rounded-xl border bg-card/95 p-4 shadow-2xl backdrop-blur"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-primary text-xs font-semibold">
              <Sparkles className="h-4 w-4" />
              <span>AI Companion Insight</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsResponseVisible(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-xs leading-relaxed text-foreground/90 max-h-48 overflow-y-auto whitespace-pre-line">
            {lastResponse}
          </div>
        </div>
      )}

      {/* Reading Navigation Footer */}
      <footer
        ref={footerRef}
        className="sticky bottom-0 z-20 flex h-14 shrink-0 items-center justify-between border-t bg-background/95 px-4 backdrop-blur md:px-8"
      >
        <Button
          ref={prevButtonRef}
          onClick={() => changePage('prev')}
          disabled={currentPage === 0 || isPaginating}
          variant="outline"
          size="sm"
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Prev</span>
        </Button>

        <div className="text-xs font-mono text-muted-foreground">
          {pages.length > 0 ? `Page ${currentPage + 1} of ${pages.length}` : '—'}
        </div>

        <Button
          ref={nextButtonRef}
          onClick={() => changePage('next')}
          disabled={currentPage >= pages.length - 1 || isPaginating}
          variant="outline"
          size="sm"
          className="gap-1"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </footer>
    </div>
  );
}
