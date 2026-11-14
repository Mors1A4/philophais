import { useState, useEffect, useCallback } from "react";
import type { Book, Note, Paragraph } from "@/lib/types";

// Helper to check if running inside Tauri
function isTauriEnvironment(): boolean {
  return typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);
}

// Lightweight IndexedDB fallback for standard web browser dev mode
const DB_NAME = "philophais_local_db";
const DB_VERSION = 1;
const STORE_NAME = "books";

function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function useBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load books from Rust backend (or IndexedDB in browser)
  const loadBooks = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isTauriEnvironment()) {
        const { invoke } = await import("@tauri-apps/api/core");
        const summaries = await invoke<any[]>("get_library_books");
        const loadedBooks: Book[] = summaries.map((s) => ({
          id: s.id,
          title: s.title,
          author: s.author,
          cover: s.cover || "https://placehold.co/400x600",
          content: [],
          lastReadParagraphKey: s.lastReadParagraphKey,
          notes: [],
        }));
        setBooks(loadedBooks);
      } else {
        const db = await openIndexedDb();
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const list = (req.result as Book[]) || [];
          setBooks(list.map((b) => ({ ...b, content: [] })));
        };
      }
    } catch (err) {
      console.error("Failed to load local books:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const addBook = useCallback(async (newBook: Omit<Book, "id">) => {
    const bookId = `book_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const bookWithId: Book = {
      ...newBook,
      id: bookId,
      cover: newBook.cover || "https://placehold.co/400x600",
      notes: newBook.notes || [],
    };

    try {
      if (isTauriEnvironment()) {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("save_book", { book: bookWithId });
      } else {
        const db = await openIndexedDb();
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put(bookWithId);
      }

      setBooks((prev) => [...prev, { ...bookWithId, content: [] }]);
      return bookWithId;
    } catch (err) {
      console.error("Failed to save book locally:", err);
      throw err;
    }
  }, []);

  const getBookById = useCallback(async (id: string): Promise<Book | undefined> => {
    // Check if full content already in memory
    const existing = books.find((b) => b.id === id && b.content && b.content.length > 0);
    if (existing) return existing;

    try {
      let fullBook: Book | undefined;
      if (isTauriEnvironment()) {
        const { invoke } = await import("@tauri-apps/api/core");
        const res = await invoke<Book | null>("get_book_content", { bookId: id });
        if (res) fullBook = res;
      } else {
        const db = await openIndexedDb();
        fullBook = await new Promise<Book | undefined>((resolve) => {
          const tx = db.transaction(STORE_NAME, "readonly");
          const req = tx.objectStore(STORE_NAME).get(id);
          req.onsuccess = () => resolve(req.result as Book | undefined);
          req.onerror = () => resolve(undefined);
        });
      }

      if (fullBook) {
        setBooks((prev) => {
          const idx = prev.findIndex((b) => b.id === id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = fullBook!;
            return next;
          }
          return [...prev, fullBook!];
        });
        return fullBook;
      }
      return undefined;
    } catch (err) {
      console.error("Failed to load book content:", err);
      return undefined;
    }
  }, [books]);

  const deleteBook = useCallback(async (id: string) => {
    try {
      if (isTauriEnvironment()) {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("delete_book", { bookId: id });
      } else {
        const db = await openIndexedDb();
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).delete(id);
      }
      setBooks((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error("Failed to delete book:", err);
    }
  }, []);

  const updateBookProgress = useCallback(async (bookId: string, paragraphKey: string) => {
    try {
      if (isTauriEnvironment()) {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("update_book_progress", { bookId, paragraphKey });
      } else {
        const db = await openIndexedDb();
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(bookId);
        req.onsuccess = () => {
          if (req.result) {
            const updated = { ...req.result, lastReadParagraphKey: paragraphKey };
            store.put(updated);
          }
        };
      }
      setBooks((prev) =>
        prev.map((b) => (b.id === bookId ? { ...b, lastReadParagraphKey: paragraphKey } : b))
      );
    } catch (err) {
      console.error("Failed to update progress:", err);
    }
  }, []);

  const addNote = useCallback(async (bookId: string, note: Note) => {
    try {
      if (isTauriEnvironment()) {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("save_book_note", { bookId, note });
      } else {
        const db = await openIndexedDb();
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(bookId);
        req.onsuccess = () => {
          if (req.result) {
            const notes = req.result.notes || [];
            store.put({ ...req.result, notes: [...notes, note] });
          }
        };
      }
      setBooks((prev) =>
        prev.map((b) => {
          if (b.id === bookId) {
            return { ...b, notes: [...(b.notes || []), note] };
          }
          return b;
        })
      );
    } catch (err) {
      console.error("Failed to add note:", err);
      throw err;
    }
  }, []);

  const deleteNote = useCallback(async (bookId: string, noteToDelete: Note) => {
    try {
      if (isTauriEnvironment()) {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("delete_book_note", { bookId, noteId: noteToDelete.id });
      } else {
        const db = await openIndexedDb();
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(bookId);
        req.onsuccess = () => {
          if (req.result) {
            const notes = (req.result.notes || []).filter((n: Note) => n.id !== noteToDelete.id);
            store.put({ ...req.result, notes });
          }
        };
      }
      setBooks((prev) =>
        prev.map((b) => {
          if (b.id === bookId) {
            return { ...b, notes: (b.notes || []).filter((n) => n.id !== noteToDelete.id) };
          }
          return b;
        })
      );
    } catch (err) {
      console.error("Failed to delete note:", err);
      throw err;
    }
  }, []);

  const clearBooks = useCallback(async () => {
    setBooks([]);
  }, []);

  return {
    books,
    isLoading,
    addBook,
    getBookById,
    deleteBook,
    updateBookProgress,
    addNote,
    deleteNote,
    clearBooks,
    reload: loadBooks,
  };
}
