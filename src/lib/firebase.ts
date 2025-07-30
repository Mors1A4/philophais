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
import type { Book } from "@/lib/types";

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

export { app, db, auth };

export const addBookToLibrary = async (
  userId: string,
  book: Omit<Book, "id">
): Promise<Book> => {
  const booksCollection = collection(db, "users", userId, "books");
  
  // Separate content from metadata
  const { content, ...metadata } = book;
  const bookData = { 
    ...metadata, 
    notes: metadata.notes || [] 
  };
  
  const batch = writeBatch(db);

  // 1. Create the main book document with metadata
  const bookDocRef = doc(booksCollection);
  batch.set(bookDocRef, bookData);

  // 2. Create the content document in a subcollection
  const contentDocRef = doc(collection(bookDocRef, 'content'), 'main');
  batch.set(contentDocRef, { value: content });

  await batch.commit();

  return { ...bookData, content, id: bookDocRef.id };
};
