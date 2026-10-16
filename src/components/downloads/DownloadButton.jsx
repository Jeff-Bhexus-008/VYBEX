import { useEffect, useState } from "react";
import { CheckCircle2, Download, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/AuthContext";
import { startDownload, cancelDownload, subscribeActive } from "@/lib/downloads-client";
import { getDownloadMeta } from "@/lib/downloads-store";
import { formatBytes } from "@/lib/format";

/**
 * Offline download control for a VYBEX video — rendered only when the owner
 * has authorized downloads. The file is stored on this device, not in the
 * online Library.
 */
export default function DownloadButton({ video }) {
  const { user, navigateToLogin } = useAuth();
  const [entry, setEntry] = useState(null);
  const [onDevice, setOnDevice] = useState(false);

  useEffect(
    () => subscribeActive((list) => setEntry(list.find((d) => d.videoId === video.id) ?? null)),
    [video.id],
  );

  useEffect(() => {
    let alive = true;
    getDownloadMeta(video.id)
      .then((meta) => { if (alive) setOnDevice(!!meta); })
      .catch(() => {});
    return () => { alive = false; };
  }, [video.id, entry]);

  if (video.downloadable !== true || video.upcoming) return null;

  const pct = entry?.total ? Math.round((entry.received / entry.total) * 100) : null;

  const handleStart = () => {
    if (!user) {
      toast("Sign in to download this video for offline viewing");
      return navigateToLogin();
    }
    startDownload(video);
  };

  if (entry?.status === "downloading" || entry?.status === "preparing") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2" aria-live="polite">
        <div className="w-36">
          <Progress value={pct ?? 0} className="h-1.5" />
        </div>
        <span className="text-xs text-muted-foreground">
          {pct !== null ? `${pct}%` : formatBytes(entry.received) || "0 B"}
        </span>
        <button
          type="button"
          onClick={() => cancelDownload(video.id)}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:text-destructive"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" /> Cancel
        </button>
      </div>
    );
  }

  if (entry?.status === "completed") {
    return (
      <Button asChild variant="secondary">
        <Link to="/downloads">
          <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" /> Downloaded — open Downloads
        </Link>
      </Button>
    );
  }

  if (entry?.status === "failed") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-destructive">{entry.error}</span>
        <Button type="button" variant="outline" onClick={() => startDownload(video)}>Try again</Button>
      </div>
    );
  }

  if (onDevice) {
    return (
      <Button asChild variant="secondary">
        <Link to="/downloads">
          <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" /> On this device
        </Link>
      </Button>
    );
  }

  return (
    <Button type="button" variant="secondary" onClick={handleStart}>
      <Download className="h-4 w-4" aria-hidden="true" /> Download
    </Button>
  );
}