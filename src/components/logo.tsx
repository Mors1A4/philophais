import React from 'react';
import { BookMarked } from 'lucide-react';

export function Logo({ className, onClick }: { className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2 cursor-pointer select-none transition-opacity hover:opacity-90 ${className || ''}`}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <BookMarked className="h-5 w-5" />
      </div>
      <span className="text-xl font-bold font-headline tracking-tight">
        Philophais
      </span>
    </div>
  );
}
