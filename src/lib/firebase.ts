import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  writeBatch,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import type { Book, Paragraph } from "@/lib/types";

// Your web app's Firebase configuration
// IMPORTANT: This is a public configuration.
// For security, ensure you have proper Firestore security rules and App Check configured.
const firebaseConfig = {
  apiKey: "AIzaSyDreGZnxVNOr4Zl_yirKbvmteUqp6PNNXM",
  authDomain: "reader-fe258.firebaseapp.com",
  projectId: "reader-fe258",
  storageBucket: "reader-fe258.firebasestorage.app",
  messagingSenderId: "833760086150",
  appId: "1:833760086150:web:d03819b08b4537bee56907",
  measurementId: "G-1PR2LLE638",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);
const MAX_DOC_SIZE = 1000000; // 1MB with a buffer

export { app, db, auth };

export const addBookToLibrary = async (
  userId: string,
  book: Omit<Book, "id">
): Promise<Book> => {
  const booksCollection = collection(db, "users", userId, "books");
  
  const { content, ...metadata } = book;
  const bookData = { 
    ...metadata, 
    notes: metadata.notes || [] 
  };
  
  const batch = writeBatch(db);

  const bookDocRef = doc(booksCollection);
  batch.set(bookDocRef, bookData);

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

  return { ...bookData, content, id: bookDocRef.id };
};
