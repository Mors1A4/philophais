"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

const AUTH_KEY = "epub-mentor-auth-token";

export function useAuth() {
  const router = useRouter();

  const login = useCallback(() => {
    // In a real app, you'd get a token from a server
    localStorage.setItem(AUTH_KEY, "dummy_token");
    router.push("/library");
  }, [router]);

  const register = useCallback(() => {
    // In a real app, you would register the user and then log them in.
    localStorage.setItem(AUTH_KEY, "dummy_token");
    router.push("/library");
  }, [router]);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    router.push("/");
  }, [router]);

  return { login, logout, register };
}

export function useAuthRedirect(shouldBeAuthenticated: boolean) {
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<"loading" | "auth" | "no-auth">("loading");

  useEffect(() => {
    let token: string | null = null;
    try {
      token = localStorage.getItem(AUTH_KEY);
    } catch (error) {
      console.error("Could not access localStorage:", error);
    }
    
    if (token) {
      setAuthStatus("auth");
    } else {
      setAuthStatus("no-auth");
    }
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

  return authStatus;
}
