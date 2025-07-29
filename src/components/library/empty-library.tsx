import { UploadButton } from "./upload-button";
import type { Book } from "@/lib/types";
import { FileText } from "lucide-react";

interface EmptyLibraryProps {
  onUpload: (book: Omit<Book, "id">) => void;
}

export function EmptyLibrary({ onUpload }: EmptyLibraryProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-12 text-center">
      <div className="mb-4 rounded-full bg-secondary p-4">
        <FileText className="h-12 w-12 text-muted-foreground" />
      </div>
      <h2 className="mb-2 text-2xl font-bold font-headline">Your Library is Empty</h2>
      <p className="mb-6 max-w-sm text-muted-foreground">
        Upload your first .epub book to get started with your AI-powered reading companion.
      </p>
      <UploadButton onUpload={onUpload} />
    </div>
  );
}
