import React from "react";
import { useBooks } from "@/hooks/use-books";
import { BookCard } from "./book-card";
import { EmptyLibrary } from "./empty-library";
import { UploadButton } from "./upload-button";
import { Button } from "@/components/ui/button";
import { Sparkles, Compass } from "lucide-react";
import { Logo } from "@/components/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { BrowseGutenbergCard } from "./browse-gutenberg-card";

interface LibraryClientProps {
  onSelectBook: (id: string) => void;
  onOpenBrowse: () => void;
  onCheckUpdates: () => void;
  updateAvailable?: boolean;
}

export function LibraryClient({
  onSelectBook,
  onOpenBrowse,
  onCheckUpdates,
  updateAvailable,
}: LibraryClientProps) {
  const { books, addBook, isLoading, deleteBook } = useBooks();
  const { toast } = useToast();

  const handleDeleteBook = (bookId: string) => {
    deleteBook(bookId);
    toast({
      title: "Book Deleted",
      description: "The book has been removed from your local library.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b bg-background/95 backdrop-blur px-4 md:px-8">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-8 w-24" />
        </header>
        <main className="flex-1 p-4 md:p-8">
          <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-[138px]" />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-[2/3] w-full rounded-lg" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur px-4 md:px-8">
        <Logo />
        <div className="flex items-center gap-2">
          <Button
            onClick={onOpenBrowse}
            variant="outline"
            size="sm"
            className="gap-1.5"
          >
            <Compass className="h-4 w-4" />
            <span className="hidden sm:inline">Browse</span>
          </Button>

          <Button
            onClick={onCheckUpdates}
            variant={updateAvailable ? "default" : "ghost"}
            size="sm"
            className="gap-1.5 relative"
          >
            <Sparkles className="h-4 w-4 text-primary group-hover:text-foreground" />
            <span className="hidden sm:inline">Updates</span>
            {updateAvailable && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
            )}
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-headline text-3xl sm:text-4xl font-bold tracking-tight">Your Library</h1>
            <p className="text-sm text-muted-foreground mt-1">100% offline & stored locally on this device</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <UploadButton onUpload={addBook} />
          </div>
        </div>

        {books.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onSelectBook={onSelectBook}
                onDelete={handleDeleteBook}
              />
            ))}
            <BrowseGutenbergCard onBrowse={onOpenBrowse} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-2xl">
            <EmptyLibrary onUpload={addBook} />
            <BrowseGutenbergCard onBrowse={onOpenBrowse} />
          </div>
        )}
      </main>
    </div>
  );
}
