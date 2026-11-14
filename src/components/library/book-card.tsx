import React, { useState } from "react";
import type { Book } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
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

interface BookCardProps {
  book: Book;
  onSelectBook: (id: string) => void;
  onDelete: (id: string) => void;
}

export function BookCard({ book, onSelectBook, onDelete }: BookCardProps) {
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(book.id);
  };

  return (
    <div
      className="group relative cursor-pointer"
      onMouseEnter={() => setIsMenuVisible(true)}
      onMouseLeave={() => setIsMenuVisible(false)}
      onClick={() => onSelectBook(book.id)}
    >
      <Card className="overflow-hidden transition-all duration-300 ease-in-out group-hover:shadow-lg group-hover:-translate-y-1">
        <CardContent className="p-0">
          <div className="aspect-[2/3] w-full overflow-hidden bg-muted">
            <img
              src={book.cover || "https://placehold.co/400x600?text=Cover"}
              alt={`Cover of ${book.title}`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  "https://placehold.co/400x600?text=Book";
              }}
            />
          </div>
          <div className="p-3">
            <h3 className="font-headline font-bold truncate text-sm sm:text-base">{book.title}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{book.author}</p>
          </div>
        </CardContent>
      </Card>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            size="icon"
            onClick={(e) => e.stopPropagation()}
            className={`absolute top-2 right-2 z-10 h-7 w-7 rounded-full transition-opacity duration-200 ${
              isMenuVisible ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Book?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove &quot;{book.title}&quot; from your local library?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
