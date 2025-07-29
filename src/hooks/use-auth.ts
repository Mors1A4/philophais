"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { 
  getAuth, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  type User
} from "firebase/auth";
import { app } from "@/lib/firebase"; // Import the initialized Firebase app
import { useToast } from "./use-toast";

const auth = getAuth(app);

export function useAuth() {
  const router = useRouter();
  const { toast } = useToast();

  const handleAuthError = (error: any) => {
    console.error("Firebase Auth Error:", error);
    let message = "An unexpected error occurred.";
    if (error.code) {
      switch (error.code) {
        case "auth/invalid-email":
          message = "Please enter a valid email address.";
          break;
        case "auth/user-not-found":
        case "auth/wrong-password":
          message = "Invalid email or password.";
          break;
        case "auth/email-already-in-use":
          message = "An account with this email already exists.";
          break;
        case "auth/weak-password":
          message = "The password is too weak. Please use at least 6 characters.";
          break;
        default:
          message = error.message;
          break;
      }
    }
    toast({
      variant: "destructive",
      title: "Authentication Failed",
      description: message,
    });
  };

  const login = useCallback(async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/library");
    } catch (error) {
      handleAuthError(error);
    }
  }, [router, toast]);

  const register = useCallback(async (email, password) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.push("/library");
    } catch (error) {
      handleAuthError(error);
    }
  }, [router, toast]);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      handleAuthError(error);
    }
  }, [router, toast]);

  return { login, logout, register };
}

export function useAuthRedirect(shouldBeAuthenticated: boolean) {
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<"loading" | "auth" | "no-auth">("loading");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        setAuthStatus("auth");
      } else {
        setUser(null);
        setAuthStatus("no-auth");
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (authStatus === "loading") {
      return;
    }

    if (shouldBeAuthenticated && authStatus === "no-auth") {
      router.replace("/");
    }

    if (!shouldBeAuthenticated && authStatus === "auth") {
      router.replace("/library");
    }
  }, [authStatus, shouldBeAuthenticated, router]);

  return { authStatus, user };
}
