"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, useAuthRedirect } from "@/hooks/use-auth";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";

export default function LoginPage() {
  const { authStatus } = useAuthRedirect(false);
  const { login } = useAuth();
  
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleAuthAction = (e: React.FormEvent) => {
    e.preventDefault();
    const email = emailRef.current?.value;
    const password = passwordRef.current?.value;
    if (email && password) {
      login(email, password);
    }
  };

  if (authStatus === 'loading') {
    return <LoadingSpinner />;
  }

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center p-4">
       <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>

      <div className="w-full max-w-md">
        <Card className="shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Image 
                src="https://placehold.co/100x100.png"
                alt="EpubMentor Logo" 
                width={80} 
                height={80} 
                className="rounded-full"
                data-ai-hint="logo book"
              />
            </div>
            <CardTitle className="font-headline text-3xl">EpubMentor</CardTitle>
            <CardDescription>Your AI-powered reading companion</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuthAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="user@example.com" required ref={emailRef} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required ref={passwordRef}/>
              </div>
              <Button type="submit" className="w-full font-headline" variant="default">
                Login
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
             <Button asChild variant="link" className="text-sm text-muted-foreground">
              <Link href="/register">Don't have an account? Register</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
