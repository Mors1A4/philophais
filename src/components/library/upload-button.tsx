"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { mobyDick } from "@/lib/mock-data";
import type { Book } from "@/lib/types";

interface UploadButtonProps {
  onUpload: (book: Omit<Book, "id">) => void;
}

export function UploadButton({ onUpload }: UploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.endsWith(".epub")) {
        // In a real app, you would parse the epub file here.
        // For this scaffold, we'll use mock data.
        console.log(`Simulating upload and parsing for: ${file.name}`);
        onUpload(mobyDick);

        toast({
          title: "Upload Successful",
          description: `"${mobyDick.title}" has been added to your library.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please upload a valid .epub file.",
        });
      }
      
      // Reset file input
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
      />
      <Button onClick={handleButtonClick} className="font-headline bg-accent text-accent-foreground hover:bg-accent/90">
        <Upload className="mr-2 h-4 w-4" />
        Upload Book
      </Button>
    </>
  );
}
