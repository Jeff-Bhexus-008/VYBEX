import { Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { formatBytes, timeAgo } from "@/lib/format";

/** A completed download stored on this device, with offline play and delete. */
export default function DownloadedVideoCard({ meta, onPlay, onDelete }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-card/60 p-3 transition-colors hover:border-primary/40">
      <div className="h-16 w-28 shrink-0 overflow-hidden rounded-lg border border-border/50 bg-secondary">
        {meta.thumbnail ? <Image src={meta.thumbnail} alt="" className="h-full w-full object-cover" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{meta.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatBytes(meta.sizeBytes) || "Unknown size"} · Downloaded {timeAgo(meta.downloadedAt)}
        </p>
        <p className="text-xs text-muted-foreground/70">Plays from this device — no internet needed for the file</p>
      </div>
      <Button
        size="sm"
        className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
        onClick={onPlay}
      >
        <Play className="h-3.5 w-3.5" aria-hidden="true" /> Play
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="shrink-0 text-destructive hover:bg-destructive/10"
        aria-label={`Delete downloaded copy of ${meta.title}`}
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}