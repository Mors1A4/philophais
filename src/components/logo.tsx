import { BookMarked } from 'lucide-react';
import Link from 'next/link';

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/library" className={`flex items-center gap-2 text-white ${className}`}>
      <BookMarked className="h-7 w-7" />
      <span className="text-2xl font-bold font-headline">
        EpubMentor
      </span>
    </Link>
  );
}
