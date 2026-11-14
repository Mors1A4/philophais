import React, { useState, useEffect, useCallback } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { useGutendex } from "@/hooks/use-gutendex";
import { useBooks } from "@/hooks/use-books";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Plus, Search } from "lucide-react";
import { Logo } from "@/components/logo";
import type { GutendexBook, Book } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { parseEpub } from "@/lib/epub-parser";

const fetchEpub = async (url: string): Promise<File | null> => {
  try {
    const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new File([blob], "book.epub", { type: "application/epub+zip" });
  } catch (error) {
    console.error("Failed to fetch epub:", error);
    return null;
  }
};

function GutendexBookCard({
  book: gutendexBook,
  onBookAdded,
}: {
  book: GutendexBook;
  onBookAdded?: () => void;
}) {
  const { addBook } = useBooks();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const coverImage =
    gutendexBook.formats["image/jpeg"] ??
    `https://www.gutenberg.org/cache/epub/${gutendexBook.id}/pg${gutendexBook.id}.cover.medium.jpg`;

  const handleAddBook = async () => {
    setIsAdding(true);
    const epubUrl = gutendexBook.formats["application/epub+zip"];
    if (!epubUrl) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No EPUB file available for this book.",
      });
      setIsAdding(false);
      return;
    }

    const file = await fetchEpub(epubUrl);
    if (!file) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to download EPUB file. Check internet connection.",
      });
      setIsAdding(false);
      return;
    }

    try {
      const parsedBook = await parseEpub(file);
      const bookData: Omit<Book, "id"> = {
        ...parsedBook,
        cover: coverImage,
      };

      await addBook(bookData);
      toast({
        title: "Success",
        description: `"${bookData.title}" has been added to your local library.`,
      });
      if (onBookAdded) onBookAdded();
    } catch (error) {
      console.error("Error processing epub file:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred.";
      toast({
        variant: "destructive",
        title: "Processing Failed",
        description: `Could not process the EPUB file. ${errorMessage}`,
      });
    } finally {
      setIsAdding(false);
    }
  };

  const author = gutendexBook.authors[0]?.name || "Unknown Author";

  return (
    <div className="group relative">
      <Card className="overflow-hidden transition-all duration-300 ease-in-out group-hover:shadow-lg group-hover:-translate-y-1 h-full flex flex-col">
        <CardContent className="p-0 flex flex-col flex-1">
          <div className="aspect-[2/3] w-full overflow-hidden bg-muted">
            <img
              src={coverImage}
              alt={`Cover of ${gutendexBook.title}`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  "https://placehold.co/400x600?text=Gutenberg";
              }}
            />
          </div>
          <div className="p-3 flex flex-col flex-1">
            <h3 className="font-headline font-bold truncate flex-1 text-sm sm:text-base">
              {gutendexBook.title}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{author}</p>
          </div>
          <div className="p-3 pt-0">
            <Button
              onClick={handleAddBook}
              disabled={isAdding}
              size="sm"
              className="w-full gap-1.5"
            >
              {isAdding ? <Loader2 className="animate-spin h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {isAdding ? "Adding..." : "Add to Library"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface BrowseClientProps {
  onBack: () => void;
  onBookAdded?: () => void;
}

export function BrowseClient({ onBack, onBookAdded }: BrowseClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const { books, isLoading, hasNextPage, loadMore } = useGutendex(debouncedSearchTerm);

  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + document.documentElement.scrollTop >=
      document.documentElement.offsetHeight - 500
    ) {
      if (hasNextPage && !isLoading) {
        loadMore();
      }
    }
  }, [hasNextPage, isLoading, loadMore]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur px-4 md:px-8">
        <div className="flex items-center gap-4">
          <Button onClick={onBack} variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Logo />
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8">
        <div className="mb-8">
          <h1 className="font-headline text-3xl sm:text-4xl font-bold tracking-tight mb-2">
            Browse Public Domain Books
          </h1>
          <p className="text-muted-foreground text-sm">
            Search 70,000+ free ebooks from Project Gutenberg and save them directly to your device.
          </p>
          <div className="mt-4 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by title, author, or topic..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {isLoading && books.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {books.map((book) => (
              <GutendexBookCard key={book.id} book={book} onBookAdded={onBookAdded} />
            ))}
          </div>
        )}

        {isLoading && books.length > 0 && (
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </main>
    </div>
  );
}
