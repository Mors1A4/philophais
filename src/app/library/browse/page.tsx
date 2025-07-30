import { BrowseClient } from "@/components/library/browse-client";
import { Suspense } from "react";

export default function BrowsePage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Loading books...</div>}>
      <BrowseClient />
    </Suspense>
  );
}
