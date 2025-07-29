"use client";

import { useState, useEffect, useCallback } from "react";
import type { Book } from "@/lib/types";

const BOOKS_KEY = "epub-mentor-books";

export function useBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedBooks = localStorage.getItem(BOOKS_KEY);
      if (storedBooks) {
        setBooks(JSON.parse(storedBooks));
      }
    } catch (error) {
      console.error("Failed to load books from localStorage", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addBook = useCallback((newBook: Omit<Book, "id">) => {
    try {
      setBooks((prevBooks) => {
        const bookWithId: Book = { ...newBook, id: crypto.randomUUID() };
        const updatedBooks = [...prevBooks, bookWithId];
        localStorage.setItem(BOOKS_KEY, JSON.stringify(updatedBooks));
        return updatedBooks;
      });
    } catch (error) {
      console.error("Failed to save book to localStorage", error);
    }
  }, []);

  const getBookById = useCallback((id: string): Book | undefined => {
    return books.find((book) => book.id === id);
  }, [books]);
  
  const clearBooks = useCallback(() => {
    try {
      localStorage.removeItem(BOOKS_KEY);
      setBooks([]);
    } catch (error) {
      console.error("Failed to clear books from localStorage", error);
    }
  }, []);

  const deleteBook = useCallback((id: string) => {
    try {
      setBooks((prevBooks) => {
        const updatedBooks = prevBooks.filter((book) => book.id !== id);
        localStorage.setItem(BOOKS_KEY, JSON.stringify(updatedBooks));
        return updatedBooks;
      });
    } catch (error) {
      console.error("Failed to delete book from localStorage", error);
    }
  }, []);


  return { books, addBook, getBookById, clearBooks, isLoading, deleteBook };
}
