import type { Book } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

interface BookCardProps {
  book: Book;
  onDelete: (id: string) => void;
}

export function BookCard({ book, onDelete }: BookCardProps) {
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(book.id);
  };

  return (
    <div
      className="group relative"
      onMouseEnter={() => setIsMenuVisible(true)}
      onMouseLeave={() => setIsMenuVisible(false)}
    >
      <Link href={`/read/${book.id}`} className="block">
        <Card className="overflow-hidden transition-all duration-300 ease-in-out group-hover:shadow-lg group-hover:-translate-y-1">
          <CardContent className="p-0">
            <div className="aspect-[2/3] w-full overflow-hidden">
              <Image
                src={book.cover}
                alt={`Cover of ${book.title}`}
                width={400}
                height={600}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                data-ai-hint="book cover"
              />
            </div>
            <div className="p-3">
              <h3 className="font-headline font-bold truncate">{book.title}</h3>
              <p className="text-sm text-muted-foreground truncate">{book.author}</p>
            </div>
          </CardContent>
        </Card>
      </Link>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            size="icon"
            className={`absolute top-2 right-2 z-10 h-8 w-8 transition-opacity duration-200 ${isMenuVisible ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
            onClick={(e) => e.preventDefault()} // Prevent link navigation
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the book
              "{book.title}" from your library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
