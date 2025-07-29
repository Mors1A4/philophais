import { LibraryClient } from "@/components/library/library-client";
import { Suspense } from "react";

export default function LibraryPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Loading...</div>}>
      <LibraryClient />
    </Suspense>
  );
}
