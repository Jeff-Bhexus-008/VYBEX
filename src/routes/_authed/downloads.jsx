import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Info } from "lucide-react";
import { toast } from "sonner";
import useDownloads from "@/hooks/useDownloads";
import StorageSummary from "@/components/downloads/StorageSummary";
import ActiveDownloadItem from "@/components/downloads/ActiveDownloadItem";
import DownloadedVideoCard from "@/components/downloads/DownloadedVideoCard";
import OfflinePlayerDialog from "@/components/downloads/OfflinePlayerDialog";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { estimateStorage } from "@/lib/downloads-store";

export const Route = createFileRoute("/_authed/downloads")({
  ssr: false, // shows files stored in this browser only
  head: () => ({ meta: [{ title: "Downloads — VYBEX" }] }),
  component: DownloadsPage,
});

function DownloadsPage() {
  const { metas, activeList, storageError, remove, clearAll } = useDownloads();
  const [estimate, setEstimate] = useState(null);
  const [playing, setPlaying] = useState(null);

  useEffect(() => {
    estimateStorage().then(setEstimate).catch(() => setEstimate(null));
  }, [metas]);

  const handleDelete = async (meta) => {
    try {
      await remove(meta.videoId);
      toast.success(`Removed “${meta.title}” from this device`);
    } catch (err) {
      toast.error(err?.message || "Could not remove the downloaded file");
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAll();
      toast.success("All downloads removed from this device");
    } catch (err) {
      toast.error(err?.message || "Could not clear downloads");
    }
  };

  const totalBytes = (metas ?? []).reduce((sum, m) => sum + (m.sizeBytes ?? 0), 0);

  return (
    <div className="pb-safe pt-4">
      <h1 className="text-2xl font-extrabold tracking-tight">Downloads</h1>

      <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-border/60 bg-card/50 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Downloads are the actual authorized media file, stored in{" "}
          <span className="text-foreground">this browser's local storage on this device</span> — separate from your
          online <span className="text-foreground">Library</span>, which bookmarks titles to your VYBEX account across
          devices. A download made here won't appear on your other devices, and clearing your browser data can remove
          downloaded files. YouTube content can't be downloaded by VYBEX — open those videos on YouTube to use its own
          offline options.
        </p>
      </div>

      {storageError ? (
        <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Local storage is unavailable in this browser ({storageError}). Downloads need browser storage — try a
          regular, non-private browsing window.
        </div>
      ) : (
        <>
          <StorageSummary
            count={metas?.length ?? 0}
            totalBytes={totalBytes}
            estimate={estimate}
            onClearAll={handleClearAll}
          />

          {activeList.length > 0 ? (
            <section className="mt-6" aria-label="Active downloads">
              <h2 className="text-sm font-bold text-foreground">In progress</h2>
              <div className="mt-3 space-y-3">
                {activeList.map((entry) => (
                  <ActiveDownloadItem key={entry.videoId} entry={entry} />
                ))}
              </div>
            </section>
          ) : null}

          <section className="mt-6" aria-label="Downloaded videos">
            <h2 className="text-sm font-bold text-foreground">On this device</h2>
            <div className="mt-3 space-y-3">
              {metas === null ? null : metas.length === 0 ? (
                <EmptyState
                  icon={Download}
                  title="No downloads on this device"
                  description="Only VYBEX videos whose owner has authorized offline downloads can be saved here — look for the Download button on a video's page."
                  action={
                    <Button asChild variant="outline">
                      <Link to="/search">Browse videos</Link>
                    </Button>
                  }
                />
              ) : (
                metas.map((meta) => (
                  <DownloadedVideoCard
                    key={meta.videoId}
                    meta={meta}
                    onPlay={() => setPlaying(meta)}
                    onDelete={() => handleDelete(meta)}
                  />
                ))
              )}
            </div>
          </section>

          <p className="mt-6 text-xs text-muted-foreground/70">
            Deleting a download only removes this device's local copy — the original video and your online Library are
            unaffected.
          </p>
        </>
      )}

      <OfflinePlayerDialog meta={playing} onClose={() => setPlaying(null)} />
    </div>
  );
}