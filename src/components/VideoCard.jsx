import { Link } from "@tanstack/react-router";
import { Image } from "@/components/ui/image";
import { Play } from "lucide-react";
import { categoryLabel, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

const PROVIDER_LABELS = { youtube: "YouTube" };

export default function VideoCard({ video, badgeLabel, action, variant }) {
  const isEvent = variant === "event";
  // External provider results open the provider watch page instead of a VYBEX record.
  const isExternal = video.provider && video.provider !== "vybex";
  return (
    <Link
      {...(isExternal
        ? { to: "/external/$provider/$videoId", params: { provider: video.provider, videoId: video.provider_video_id || video.video_id } }
        : { to: "/video/$slug", params: { slug: video.slug } })}
      className="group block w-40 shrink-0 snap-start rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-48"
    >
      <div
        className={cn(
          "relative aspect-video overflow-hidden rounded-lg border bg-card transition-colors",
          isEvent ? "border-primary/30" : "border-border/50",
          "group-hover:border-primary/40",
        )}
      >
        <Image
          src={video.thumbnail_url}
          alt=""
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/95 text-primary-foreground shadow-glow">
            <Play className="ml-0.5 h-4 w-4 fill-current" aria-hidden="true" />
          </span>
        </div>
        {isEvent ? (
          <span className="absolute left-1.5 top-1.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
            Event
          </span>
        ) : isExternal ? (
          <span
            className={`absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              video.provider === "youtube" ? "bg-destructive/90 text-destructive-foreground" : "bg-emerald-600/90 text-white"
            }`}
          >
            {PROVIDER_LABELS[video.provider]}
          </span>
        ) : video.upcoming ? (
          <span className="absolute left-1.5 top-1.5 rounded bg-destructive/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive-foreground">
            Coming Soon
          </span>
        ) : video.is_demo ? (
          <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground/90">
            Demo
          </span>
        ) : null}
        {badgeLabel && (
          <span className="absolute right-1.5 top-1.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
            {badgeLabel}
          </span>
        )}
        {action && <div className="absolute right-1.5 bottom-1.5 z-10">{action}</div>}
        {video.duration_seconds ? (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-medium text-foreground">
            {formatDuration(video.duration_seconds)}
          </span>
        ) : null}
      </div>
      <div className="mt-1.5 px-0.5">
        <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
          {video.title}
        </h3>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {isExternal ? PROVIDER_LABELS[video.provider] : categoryLabel(video.category)}
          {video.creator_name ? ` · ${video.creator_name}` : ""}
        </p>
      </div>
    </Link>
  );
}