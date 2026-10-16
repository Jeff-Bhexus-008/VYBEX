import { AlertTriangle, ExternalLink } from "lucide-react";

// Honest fallback when a video can't play inside VYBEX: the owner or YouTube
// doesn't allow embedding, or playback failed. No fake content is substituted.
export default function ReelUnavailable({ watchUrl }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-card px-6 text-center">
      <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
      <p className="text-sm font-semibold text-foreground">This video can’t play inside VYBEX</p>
      <p className="max-w-xs text-xs text-muted-foreground">
        The owner or YouTube doesn’t allow embedding for this video. You can still watch it on YouTube.
      </p>
      <a
        href={watchUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Watch on YouTube
      </a>
    </div>
  );
}