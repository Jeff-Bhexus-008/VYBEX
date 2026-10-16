import { CheckCircle2, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Image } from "@/components/ui/image";
import { formatBytes } from "@/lib/format";
import { cancelDownload, retryDownload, dismissDownload } from "@/lib/downloads-client";

/** One in-progress, completed or failed download with cancel / retry controls. */
export default function ActiveDownloadItem({ entry }) {
  const pct = entry.total ? Math.min(100, Math.round((entry.received / entry.total) * 100)) : null;
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-card/60 p-3">
      <div className="h-16 w-28 shrink-0 overflow-hidden rounded-lg border border-border/50 bg-secondary">
        {entry.thumbnail ? <Image src={entry.thumbnail} alt="" className="h-full w-full object-cover" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{entry.title}</p>
        {entry.status === "preparing" ? (
          <p className="mt-1 text-xs text-muted-foreground">Preparing…</p>
        ) : entry.status === "downloading" ? (
          <div className="mt-1.5">
            {pct !== null ? <Progress value={pct} className="h-1.5" /> : null}
            <p className="mt-1 text-xs text-muted-foreground">
              {pct !== null ? `${pct}% · ` : "Downloading… "}
              {formatBytes(entry.received) || "0 B"}
              {entry.total ? ` of ${formatBytes(entry.total)}` : " so far"}
            </p>
          </div>
        ) : entry.status === "completed" ? (
          <p className="mt-1 text-xs text-primary">Download complete — it's listed below</p>
        ) : (
          <p className="mt-1 text-xs text-destructive">{entry.error}</p>
        )}
      </div>
      {entry.status === "downloading" || entry.status === "preparing" ? (
        <Button variant="outline" size="sm" className="shrink-0" onClick={() => cancelDownload(entry.videoId)}>
          Cancel
        </Button>
      ) : entry.status === "failed" ? (
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => retryDownload(entry)}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Retry
          </Button>
          <Button variant="ghost" size="icon" aria-label="Dismiss" onClick={() => dismissDownload(entry.videoId)}>
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      )}
    </div>
  );
}