import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
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
  const bookData = { ...book, notes: book.notes || [] };
  const docRef = await addDoc(booksCollection, bookData);
  const newBookDoc = await getDoc(docRef);
  return { ...newBookDoc.data(), id: newBookDoc.id } as Book;
};
