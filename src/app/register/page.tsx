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

export default function RegisterPage() {
  const { authStatus } = useAuthRedirect(false);
  const { register } = useAuth();
  
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null); // Though not used by Firebase Auth by default

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const email = emailRef.current?.value;
    const password = passwordRef.current?.value;
    if (email && password) {
      register(email, password);
    }
  };

  if (authStatus === 'loading') {
    return <div className="flex h-screen w-full items-center justify-center">Loading...</div>;
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
            <CardTitle className="font-headline text-3xl">Create an Account</CardTitle>
            <CardDescription>
              Join EpubMentor to start your AI-powered reading journey.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" type="text" placeholder="Your Name" required ref={nameRef} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  required
                  ref={emailRef}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required ref={passwordRef} />
              </div>
              <Button type="submit" className="w-full font-headline">
                Register
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button asChild variant="link" className="text-sm text-muted-foreground">
              <Link href="/">Already have an account? Login</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
