import { AlertTriangle, ExternalLink } from "lucide-react";

// Official YouTube embedded player. Embedding is only attempted when the video
// allows it; otherwise the user is sent to YouTube with a clear explanation.
export default function YouTubePlayer({ videoId, title, startAt = 0, embeddable }) {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const start = startAt > 2 ? `&start=${Math.floor(startAt)}` : "";

  if (embeddable === false) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
        <p className="text-sm font-semibold text-foreground">This video can’t play inside VYBEX</p>
        <p className="max-w-sm text-xs text-muted-foreground">
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

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0${start}`}
        title={title || "YouTube video"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="h-full w-full"
      />
    </div>
  );
}