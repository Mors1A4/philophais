import { ReaderClient } from "@/components/reader/reader-client";
import { Suspense } from "react";

export default function ReadPage({ params }: { params: { bookId: string } }) {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Loading book...</div>}>
      <ReaderClient bookId={params.bookId} />
    </Suspense>
  );
}
