
"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Book } from "@/lib/types";
import { parseEpub } from "@/lib/epub-parser";

interface UploadButtonProps {
  onUpload: (book: Omit<Book, "id">) => void;
}

export function UploadButton({ onUpload }: UploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.endsWith(".epub")) {
        setIsUploading(true);
        try {
          const parsedBook = await parseEpub(file);
          
          const bookData: Omit<Book, "id"> = {
            ...parsedBook,
            cover: 'https://placehold.co/400x600',
          };

          onUpload(bookData);

          toast({
            title: "Upload Successful",
            description: `"${parsedBook.title}" has been added to your library.`,
          });
        } catch (error) {
          console.error("Error processing epub file:", error);
          const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
          toast({
            variant: "destructive",
            title: "Upload Failed",
            description: `Could not process the EPUB file. ${errorMessage}`,
          });
        } finally {
          setIsUploading(false);
        }
      } else {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please upload a valid .epub file.",
        });
      }
      
      if(fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".epub"
        className="hidden"
        disabled={isUploading}
      />
      <Button onClick={handleButtonClick} disabled={isUploading} className="font-headline bg-accent text-accent-foreground hover:bg-accent/90">
        {isUploading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Upload className="mr-2 h-4 w-4" />
        )}
        {isUploading ? "Processing..." : "Upload Book"}
      </Button>
    </>
  );
}
