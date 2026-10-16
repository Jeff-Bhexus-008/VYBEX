import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { getDownloadBlobUrl } from "@/lib/downloads-store";
import { formatBytes } from "@/lib/format";

/**
 * Offline player: plays the downloaded file straight from device storage as a
 * local object URL — the media itself never touches the network.
 */
export default function OfflinePlayerDialog({ meta, onClose }) {
  const [src, setSrc] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let url = null;
    let revoked = false;
    setSrc(null);
    setError("");
    if (!meta) return undefined;
    getDownloadBlobUrl(meta.videoId)
      .then((blobUrl) => {
        if (!blobUrl) {
          setError("The downloaded file is missing or corrupted. Remove it and download it again.");
          return;
        }
        if (revoked) {
          URL.revokeObjectURL(blobUrl);
          return;
        }
        url = blobUrl;
        setSrc(blobUrl);
      })
      .catch((err) => setError(err?.message || "Could not open the downloaded file"));
    return () => {
      revoked = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [meta]);

  return (
    <Dialog open={!!meta} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate">{meta?.title ?? ""}</DialogTitle>
          <DialogDescription>
            Playing the local copy from this device{meta?.sizeBytes ? ` · ${formatBytes(meta.sizeBytes)}` : ""} — the
            file plays without internet access.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" /> {error}
          </div>
        ) : src ? (
          <video src={src} controls autoPlay playsInline className="max-h-[70vh] w-full rounded-lg bg-black" />
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-lg bg-black/60">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}