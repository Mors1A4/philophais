import { useState, useEffect, useCallback } from 'react';
import type { GutendexBook } from '@/lib/types';

interface GutendexResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: GutendexBook[];
}

const GUTENDEX_API_URL = "https://gutendex.com/books/";

export function useGutendex(searchTerm: string) {
    const [books, setBooks] = useState<GutendexBook[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchBooks = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        let url = `${GUTENDEX_API_URL}?page=${page}`;
        if (searchTerm) {
            url += `&search=${encodeURIComponent(searchTerm)}`;
        }
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to fetch books from Gutendex API.');
            }
            const data: GutendexResponse = await response.json();
            
            // Filter out books that do not have an EPUB format available
            const availableBooks = data.results.filter(book => book.formats['application/epub+zip']);

            setBooks(prev => page === 1 ? availableBooks : [...prev, ...availableBooks]);
            setHasNextPage(data.next !== null);
        } catch (e: any) {
            setError(e.message);
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [searchTerm, page]);
    
    useEffect(() => {
        // Reset page to 1 whenever search term changes
        setPage(1);
        setBooks([]); // Clear books for new search
    }, [searchTerm]);

    useEffect(() => {
        fetchBooks();
    }, [fetchBooks]);

    const loadMore = useCallback(() => {
        if (!isLoading && hasNextPage) {
            setPage(p => p + 1);
        }
    }, [isLoading, hasNextPage]);

    return { books, isLoading, error, setPage, hasNextPage, loadMore };
}
