"use client";

import { useAuthRedirect } from "@/hooks/use-auth";
import { useBooks } from "@/hooks/use-books";
import { BookCard } from "./book-card";
import { EmptyLibrary } from "./empty-library";
import { UploadButton } from "./upload-button";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getAuth, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

export function LibraryClient() {
  const { authStatus } = useAuthRedirect(true);
  const { books, addBook, isLoading, deleteBook } = useBooks();
  const { toast } = useToast();
  const router = useRouter();
  const auth = getAuth();

  const logout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Logout Failed",
        description: "An error occurred while logging out.",
      });
    }
  };

  const handleDeleteBook = (bookId: string) => {
    deleteBook(bookId);
    toast({
      title: "Book Deleted",
      description: "The book has been removed from your library.",
    });
  };

  if (authStatus === "loading" || isLoading) {
    return (
        <div className="flex min-h-screen w-full flex-col">
            <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm md:px-8">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-8 w-24" />
            </header>
            <main className="flex-1 p-4 md:p-8">
              <div className="mb-8 flex items-center justify-between">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-32" />
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="space-y-2">
                        <Skeleton className="aspect-[2/3] w-full" />
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
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm md:px-8">
        <Logo />
        <Button onClick={logout} variant="ghost" size="sm" className="font-headline">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </header>

      <main className="flex-1 p-4 md:p-8">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <h1 className="font-headline text-4xl font-bold">Your Library</h1>
          <div className="flex gap-2">
            <UploadButton onUpload={addBook} />
          </div>
        </div>

        {books.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {books.map((book) => (
              <BookCard key={book.id} book={book} onDelete={handleDeleteBook} />
            ))}
          </div>
        ) : (
          <EmptyLibrary onUpload={addBook} />
        )}
      </main>
    </div>
  );
}
