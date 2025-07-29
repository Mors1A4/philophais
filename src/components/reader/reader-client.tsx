"use client";

import { useBooks } from "@/hooks/use-books";
import { useAuthRedirect } from "@/hooks/use-auth";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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

  return (
    <div className="flex w-full flex-col">
       <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm md:px-8">
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
      <main className="prose prose-lg dark:prose-invert mx-auto max-w-3xl p-4 md:p-8">
        {book.content.map((p) => {
          if (p.type === 'blank') {
            return <div key={p.key} className="h-4"></div>;
          }
          return (
            <p key={p.key} className={getParagraphClassName(p.type, p.className)}>
              {p.text}
              <span className="select-none text-muted-foreground/50">{' <ENDPARA>'}</span>
            </p>
          );
        })}
      </main>
    </div>
  );
}
