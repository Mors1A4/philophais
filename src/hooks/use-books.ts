"use client";

import { useState, useEffect, useCallback } from "react";
import type { Book } from "@/lib/types";
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, query, where, getDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "@/lib/firebase";

const db = getFirestore(app);
const auth = getAuth(app);

export function useBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
        setBooks([]);
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchBooks = async () => {
      if (!userId) return;
      setIsLoading(true);
      try {
        const booksCollection = collection(db, "users", userId, "books");
        const booksSnapshot = await getDocs(booksCollection);
        const booksData = booksSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Book[];
        setBooks(booksData);
      } catch (error) {
        console.error("Failed to load books from Firestore", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooks();
  }, [userId]);

  const addBook = useCallback(async (newBook: Omit<Book, "id">) => {
    if (!userId) return;
    try {
      const booksCollection = collection(db, "users", userId, "books");
      const docRef = await addDoc(booksCollection, newBook);
      const bookWithId: Book = { ...newBook, id: docRef.id };
      setBooks((prevBooks) => [...prevBooks, bookWithId]);
    } catch (error) {
      console.error("Failed to save book to Firestore", error);
    }
  }, [userId]);

  const getBookById = useCallback(async (id: string): Promise<Book | undefined> => {
    if (!userId) return undefined;
    
    // First, try to find the book in the local state
    const localBook = books.find(book => book.id === id);
    if (localBook) {
      return localBook;
    }

    // If not found locally, fetch from Firestore
    setIsLoading(true);
    try {
      const bookDocRef = doc(db, "users", userId, "books", id);
      const bookDoc = await getDoc(bookDocRef);
      if (bookDoc.exists()) {
        const bookData = { ...bookDoc.data(), id: bookDoc.id } as Book;
        // Optionally update the local state
        setBooks(prev => [...prev, bookData]);
        return bookData;
      }
      return undefined;
    } catch (error) {
      console.error("Failed to get book by ID from Firestore", error);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [books, userId]);
  
  const clearBooks = useCallback(async () => {
    if (!userId) return;
    try {
      const booksCollection = collection(db, "users", userId, "books");
      const booksSnapshot = await getDocs(booksCollection);
      const deletePromises = booksSnapshot.docs.map(d => deleteDoc(doc(db, "users", userId, "books", d.id)));
      await Promise.all(deletePromises);
      setBooks([]);
    } catch (error) {
      console.error("Failed to clear books from Firestore", error);
    }
  }, [userId]);

  const deleteBook = useCallback(async (id: string) => {
    if (!userId) return;
    try {
      const bookDoc = doc(db, "users", userId, "books", id);
      await deleteDoc(bookDoc);
      setBooks((prevBooks) => prevBooks.filter((book) => book.id !== id));
    } catch (error) {
      console.error("Failed to delete book from Firestore", error);
    }
  }, [userId]);


  return { books, addBook, getBookById, clearBooks, isLoading, deleteBook };
}
