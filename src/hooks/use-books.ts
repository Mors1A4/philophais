
"use client";

import { useState, useEffect, useCallback } from "react";
import type { Book, Note } from "@/lib/types";
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc, getDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "@/lib/firebase";
import { findBookCover } from "@/lib/google-books-api";

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

    if (userId) {
      fetchBooks();
    }
  }, [userId]);

  const addBook = useCallback(async (newBook: Omit<Book, "id">) => {
    if (!userId) return;
    try {
      const coverUrl = await findBookCover(newBook.title, newBook.author);
      const bookWithCover: Omit<Book, "id"> = {
        ...newBook,
        coverUrl: coverUrl || newBook.coverUrl,
      };

      const booksCollection = collection(db, "users", userId, "books");
      const bookData = { ...bookWithCover, notes: newBook.notes || [] }; // Ensure notes is an array
      const docRef = await addDoc(booksCollection, bookData);
      const bookWithId: Book = { ...bookData, id: docRef.id };
      setBooks((prevBooks) => [...prevBooks, bookWithId]);
    } catch (error) {
      console.error("Failed to save book to Firestore", error);
    }
  }, [userId]);

  const getBookById = useCallback(async (id: string): Promise<Book | undefined> => {
    if (!userId) return undefined;
    
    const localBook = books.find(book => book.id === id);
    if (localBook && localBook.content.length > 0) {
      return localBook;
    }

    setIsLoading(true);
    try {
      const bookDocRef = doc(db, "users", userId, "books", id);
      const bookDoc = await getDoc(bookDocRef);
      if (bookDoc.exists()) {
        const bookData = { ...bookDoc.data(), id: bookDoc.id } as Book;
        setBooks(prev => {
            const index = prev.findIndex(b => b.id === id);
            if (index > -1) {
                const newBooks = [...prev];
                newBooks[index] = bookData;
                return newBooks;
            }
            return [...prev, bookData];
        });
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
  
  const updateBookProgress = useCallback(async (bookId: string, paragraphKey: string) => {
    if (!userId) return;
    try {
        const bookDocRef = doc(db, "users", userId, "books", bookId);
        await updateDoc(bookDocRef, {
            lastReadParagraphKey: paragraphKey
        });
        setBooks(prev => prev.map(b => b.id === bookId ? { ...b, lastReadParagraphKey: paragraphKey } : b));
    } catch (error) {
        console.error("Failed to update book progress in Firestore", error);
        throw error;
    }
  }, [userId]);

  const addNote = useCallback(async (bookId: string, note: Note) => {
    if (!userId) throw new Error("User not authenticated");
    try {
      const bookDocRef = doc(db, "users", userId, "books", bookId);
      await updateDoc(bookDocRef, {
        notes: arrayUnion(note)
      });
      setBooks(prev => prev.map(b => b.id === bookId ? { ...b, notes: [...(b.notes || []), note] } : b));
    } catch (error) {
      console.error("Failed to add note in Firestore", error);
      throw error;
    }
  }, [userId]);

  const deleteNote = useCallback(async (bookId: string, noteToDelete: Note) => {
    if (!userId) throw new Error("User not authenticated");
    
    try {
      const bookDocRef = doc(db, "users", userId, "books", bookId);
      const bookDoc = await getDoc(bookDocRef);

      if (bookDoc.exists()) {
        const bookData = bookDoc.data() as Book;
        const notes = bookData.notes || [];
        
        // Find the exact note object in the array from Firestore
        const noteToRemove = notes.find(n => n.id === noteToDelete.id);

        if (noteToRemove) {
          await updateDoc(bookDocRef, {
            notes: arrayRemove(noteToRemove)
          });

          // Optimistically update local state
          setBooks(prevBooks =>
            prevBooks.map(book => {
              if (book.id === bookId) {
                return {
                  ...book,
                  notes: book.notes?.filter(n => n.id !== noteToDelete.id),
                };
              }
              return book;
            })
          );
        } else {
           console.warn("Note not found in Firestore, may have been deleted already.");
           // Also clean up local state just in case
           setBooks(prev => prev.map(b => b.id === bookId ? { ...b, notes: b.notes?.filter(n => n.id !== noteToDelete.id) } : b));
        }
      }
    } catch (error) {
      console.error("Failed to delete note from Firestore", error);
      throw error;
    }
  }, [userId]);

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


  return { books, addBook, getBookById, clearBooks, isLoading, deleteBook, updateBookProgress, addNote, deleteNote };
}
