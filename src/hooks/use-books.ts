
"use client";

import { useState, useEffect, useCallback } from "react";
import type { Book, Note, Paragraph } from "@/lib/types";
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc, getDoc, arrayUnion, arrayRemove, writeBatch, query, orderBy, collectionGroup } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "@/lib/firebase";

const db = getFirestore(app);
const auth = getAuth(app);
const MAX_DOC_SIZE = 1000000; // 1MB, with a small buffer

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
        // We fetch only metadata here, content will be fetched on demand.
        const booksData = booksSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, content: [] })) as Book[];
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

    // Separate content from metadata
    const { content, ...metadata } = newBook;
    const bookData = { 
      ...metadata,
      cover: metadata.cover || 'https://placehold.co/400x600',
      notes: metadata.notes || [] 
    };

    try {
      const booksCollection = collection(db, "users", userId, "books");
      const batch = writeBatch(db);

      // 1. Create the main book document with metadata
      const bookDocRef = doc(booksCollection);
      batch.set(bookDocRef, bookData);

      // 2. Chunk and save the content
      const contentCollectionRef = collection(bookDocRef, 'content');
      let currentChunk: Paragraph[] = [];
      let currentChunkSize = 0;
      let chunkIndex = 0;

      for (const p of content) {
        const paraSize = JSON.stringify(p).length;
        if (currentChunkSize + paraSize > MAX_DOC_SIZE && currentChunk.length > 0) {
          const chunkDocRef = doc(contentCollectionRef, `chunk_${chunkIndex}`);
          batch.set(chunkDocRef, { value: currentChunk, index: chunkIndex });
          chunkIndex++;
          currentChunk = [];
          currentChunkSize = 0;
        }
        currentChunk.push(p);
        currentChunkSize += paraSize;
      }
      
      if (currentChunk.length > 0) {
        const chunkDocRef = doc(contentCollectionRef, `chunk_${chunkIndex}`);
        batch.set(chunkDocRef, { value: currentChunk, index: chunkIndex });
      }

      await batch.commit();
      
      const bookWithId: Book = { ...bookData, content: [], id: bookDocRef.id };
      setBooks((prevBooks) => [...prevBooks, bookWithId]);

    } catch (error) {
      console.error("Failed to save book to Firestore", error);
      throw error; // re-throw to be caught by the UI
    }
  }, [userId]);

  const getBookById = useCallback(async (id: string): Promise<Book | undefined> => {
    if (!userId) return undefined;
    
    // Check if we have the book with content already loaded
    const localBook = books.find(book => book.id === id);
    if (localBook && localBook.content && localBook.content.length > 0) {
      return localBook;
    }

    setIsLoading(true);
    try {
        const bookDocRef = doc(db, "users", userId, "books", id);
        const contentCollectionRef = collection(bookDocRef, 'content');

        const bookDoc = await getDoc(bookDocRef);
        
        if (bookDoc.exists()) {
            const bookData = { ...bookDoc.data(), id: bookDoc.id } as Book;
            
            // Fetch all content chunks and reassemble them
            const contentQuery = query(contentCollectionRef, orderBy("index"));
            const contentSnapshot = await getDocs(contentQuery);
            
            let fullContent: Paragraph[] = [];
            contentSnapshot.docs.forEach(chunkDoc => {
                const chunkData = chunkDoc.data();
                if(chunkData.value) {
                    fullContent = fullContent.concat(chunkData.value);
                }
            });
            bookData.content = fullContent;

            // Update local state with the full book data
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
      setBooks(prev => prev.map(b => {
        if (b.id === bookId) {
          const newNotes = [...(b.notes || []), note];
          return { ...b, notes: newNotes };
        }
        return b;
      }));
    } catch (error) {
      console.error("Failed to add note in Firestore", error);
      throw error;
    }
  }, [userId]);

  const deleteNote = useCallback(async (bookId: string, noteToDelete: Note) => {
    if (!userId) throw new Error("User not authenticated");
    
    try {
      const bookDocRef = doc(db, "users", userId, "books", bookId);
      // To use arrayRemove, we must provide the exact object to remove.
      // A full get is the safest way to ensure we have the correct representation.
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
      // Note: This doesn't delete subcollections in the backend, but they become inaccessible.
      // For a production app, a Cloud Function would be needed to clean up subcollections.
      const bookDoc = doc(db, "users", userId, "books", id);
      await deleteDoc(bookDoc);
      setBooks((prevBooks) => prevBooks.filter((book) => book.id !== id));
    } catch (error) {
      console.error("Failed to delete book from Firestore", error);
    }
  }, [userId]);


  return { books, addBook, getBookById, clearBooks, isLoading, deleteBook, updateBookProgress, addNote, deleteNote };
}
