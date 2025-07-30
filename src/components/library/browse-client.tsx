
"use client";

import { useState, useEffect, useCallback } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { useGutendex } from "@/hooks/use-gutendex";
import { useBooks } from "@/hooks/use-books";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Plus, Search } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import type { GutendexBook, Book } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { parseEpub } from "@/lib/epub-parser";
import { findBookCover } from "@/lib/google-books-api";

const fetchEpub = async (url: string): Promise<File | null> => {
    try {
        const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
        if (!response.ok) return null;
        const blob = await response.blob();
        return new File([blob], "book.epub", { type: "application/epub+zip" });
    } catch (error) {
        console.error("Failed to fetch epub:", error);
        return null;
    }
};

function GutendexBookCard({ book: gutendexBook }: { book: GutendexBook }) {
    const { addBook } = useBooks();
    const { toast } = useToast();
    const [isAdding, setIsAdding] = useState(false);
    const coverImage = gutendexBook.formats['image/jpeg'] ?? `https://www.gutenberg.org/cache/epub/${gutendexBook.id}/pg${gutendexBook.id}.cover.medium.jpg`;

    const handleAddBook = async () => {
        setIsAdding(true);
        const epubUrl = gutendexBook.formats["application/epub+zip"];
        if (!epubUrl) {
            toast({ variant: "destructive", title: "Error", description: "No EPUB file available for this book." });
            setIsAdding(false);
            return;
        }

        const file = await fetchEpub(epubUrl);
        if (!file) {
            toast({ variant: "destructive", title: "Error", description: "Failed to download EPUB file." });
            setIsAdding(false);
            return;
        }

        try {
            const parsedBook = await parseEpub(file);
            const finalCoverUrl = await findBookCover(parsedBook.title, parsedBook.author);
            
            const bookData: Omit<Book, "id"> = {
                ...parsedBook,
                cover: finalCoverUrl,
            };

            await addBook(bookData);
            toast({ title: "Success", description: `"${bookData.title}" has been added to your library.` });
        } catch (error) {
            console.error("Error processing epub file:", error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            toast({
                variant: "destructive",
                title: "Processing Failed",
                description: `Could not process the EPUB file. ${errorMessage}`,
            });
        } finally {
            setIsAdding(false);
        }
    };

    const author = gutendexBook.authors[0]?.name || "Unknown Author";

    return (
        <div className="group relative">
            <Card className="overflow-hidden transition-all duration-300 ease-in-out group-hover:shadow-lg group-hover:-translate-y-1 h-full flex flex-col">
                <CardContent className="p-0 flex flex-col flex-1">
                    <div className="aspect-[2/3] w-full overflow-hidden">
                        <Image
                            src={coverImage}
                            alt={`Cover of ${gutendexBook.title}`}
                            width={400}
                            height={600}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            unoptimized
                        />
                    </div>
                    <div className="p-3 flex flex-col flex-1">
                        <h3 className="font-headline font-bold truncate flex-1">{gutendexBook.title}</h3>
                        <p className="text-sm text-muted-foreground truncate">{author}</p>
                    </div>
                    <div className="p-3 pt-0">
                         <Button onClick={handleAddBook} disabled={isAdding} className="w-full">
                            {isAdding ? <Loader2 className="animate-spin" /> : <Plus />}
                            {isAdding ? "Adding..." : "Add to Library"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}


export function BrowseClient() {
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const { books, isLoading, setPage, hasNextPage } = useGutendex(debouncedSearchTerm);

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    };

    const handleLoadMore = () => {
        if(hasNextPage) {
            setPage(prev => prev + 1);
        }
    }

    return (
        <div className="flex min-h-screen w-full flex-col">
            <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b bg-background px-4 md:px-8">
                <Logo />
                <Button asChild variant="ghost" className="text-white">
                    <Link href="/library"><ArrowLeft className="mr-2 h-4 w-4" />Back to Library</Link>
                </Button>
            </header>

            <main className="flex-1 p-4 md:p-8">
                <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                    <div className="flex-1">
                        <h1 className="font-headline text-4xl font-bold">Browse Project Gutenberg</h1>
                        <p className="text-muted-foreground">Discover classic books in the public domain.</p>
                    </div>
                    <div className="relative w-full md:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search by title or author..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="w-full md:w-80 pl-10"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {books.map((book) => (
                        <GutendexBookCard key={book.id} book={book} />
                    ))}
                </div>

                {isLoading && (
                    <div className="mt-8 flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                )}
                
                {!isLoading && hasNextPage && (
                     <div className="mt-8 flex justify-center">
                        <Button onClick={handleLoadMore} variant="outline">Load More</Button>
                    </div>
                )}

                 {!isLoading && books.length === 0 && (
                    <div className="text-center col-span-full mt-16">
                        <p className="text-lg text-muted-foreground">No books found. Try a different search term.</p>
                    </div>
                 )}
            </main>
        </div>
    );
}
