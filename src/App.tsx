import React, { useState, useEffect } from "react";
import { LibraryClient } from "@/components/library/library-client";
import { BrowseClient } from "@/components/library/browse-client";
import { ReaderClient } from "@/components/reader/reader-client";
import { UpdateDialog } from "@/components/update-dialog";
import { Toaster } from "@/components/ui/toaster";
import { updateService, type UpdateInfo } from "@/services/updateService";

export type ViewState = "library" | "browse" | "read";

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>("library");
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);

  // Auto-update state
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);

  useEffect(() => {
    // Check for updates quietly in the background on startup
    const checkUpdates = async () => {
      try {
        const info = await updateService.checkForUpdate();
        if (info.available) {
          setUpdateInfo(info);
        }
      } catch (err) {
        console.warn("Background update check skipped:", err);
      }
    };
    checkUpdates();
  }, []);

  const handleOpenUpdates = async () => {
    try {
      const info = await updateService.checkForUpdate();
      setUpdateInfo(info);
      setIsUpdateDialogOpen(true);
    } catch (err) {
      console.error("Manual update check error:", err);
    }
  };

  const handleSelectBook = (bookId: string) => {
    setSelectedBookId(bookId);
    setCurrentView("read");
  };

  const handleBackToLibrary = () => {
    setSelectedBookId(null);
    setCurrentView("library");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {currentView === "library" && (
        <LibraryClient
          onSelectBook={handleSelectBook}
          onOpenBrowse={() => setCurrentView("browse")}
          onCheckUpdates={handleOpenUpdates}
          updateAvailable={!!updateInfo?.available}
        />
      )}

      {currentView === "browse" && (
        <BrowseClient
          onBack={handleBackToLibrary}
          onBookAdded={handleBackToLibrary}
        />
      )}

      {currentView === "read" && selectedBookId && (
        <ReaderClient
          bookId={selectedBookId}
          onBack={handleBackToLibrary}
        />
      )}

      <UpdateDialog
        updateInfo={updateInfo}
        isOpen={isUpdateDialogOpen}
        onClose={() => setIsUpdateDialogOpen(false)}
      />

      <Toaster />
    </div>
  );
}
