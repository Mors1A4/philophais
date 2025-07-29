"use client";

import { Loader2 } from "lucide-react";
import { Logo } from "./logo";

export function LoadingSpinner() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-background">
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
      <Logo />
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}