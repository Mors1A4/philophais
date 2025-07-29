import type { Book } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";

interface BookCardProps {
  book: Book;
}

export function BookCard({ book }: BookCardProps) {
  return (
    <Link href={`/read/${book.id}`} className="group block">
      <Card className="overflow-hidden transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1">
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
  );
}
