import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Download, Sparkles, ExternalLink } from 'lucide-react';
import { updateService, type UpdateInfo } from '@/services/updateService';

interface UpdateDialogProps {
  updateInfo: UpdateInfo | null;
  isOpen: boolean;
  onClose: () => void;
}

export function UpdateDialog({ updateInfo, isOpen, onClose }: UpdateDialogProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  if (!updateInfo) return null;

  const handleUpdate = async () => {
    setIsDownloading(true);
    setDownloadProgress(10);
    try {
      await updateService.installUpdate(updateInfo.apkUrl, (percent) => {
        setDownloadProgress(percent);
      });
      setTimeout(() => {
        setIsDownloading(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Update install failed:', err);
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isDownloading && !open && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">New Update Available</span>
          </div>
          <DialogTitle className="font-headline text-2xl">
            {updateInfo.releaseName || `Version ${updateInfo.latestVersion}`}
          </DialogTitle>
          <DialogDescription className="text-sm">
            Current version: <span className="font-mono font-medium">v{updateInfo.currentVersion}</span> → Latest:{' '}
            <span className="font-mono font-bold text-foreground">v{updateInfo.latestVersion}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="my-2 rounded-lg bg-muted/50 p-4 text-xs font-mono whitespace-pre-line text-muted-foreground max-h-48 overflow-y-auto">
          {updateInfo.releaseNotes}
        </div>

        {isDownloading && (
          <div className="space-y-2 py-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Downloading update package...</span>
              <span>{downloadProgress}%</span>
            </div>
            <Progress value={downloadProgress} className="h-2" />
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {updateInfo.htmlUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateService.openReleasePage(updateInfo.htmlUrl)}
              disabled={isDownloading}
              className="sm:mr-auto"
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              View Release
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isDownloading}>
            Later
          </Button>
          <Button size="sm" onClick={handleUpdate} disabled={isDownloading} className="gap-1.5">
            <Download className="h-4 w-4" />
            {isDownloading ? 'Downloading...' : 'Update Now'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
