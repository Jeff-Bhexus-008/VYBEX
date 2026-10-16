import { useState } from "react";
import { toast } from "sonner";
import { Bookmark, BookmarkCheck, ExternalLink, Share2 } from "lucide-react";
import { Image } from "@/components/ui/image";
import { useAuth } from "@/lib/AuthContext";
import { toggleExternalLibrary } from "@/lib/server-fns";
import { cn } from "@/lib/utils";
import ReelPlayer from "./ReelPlayer";
import ReelUnavailable from "./ReelUnavailable";

const ACTION_BUTTON =
  "flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-foreground backdrop-blur-sm transition-colors hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * One full-screen reel: the video stage plus the bottom info overlay
 * (title, creator, description) and a compact Save / Share / YouTube rail.
 */
export default function ReelItem({ video, index, active, shouldMount, categoryLabel, saved, onToggleSave }) {
  const { user, navigateToLogin } = useAuth();
  const [busy, setBusy] = useState(false);

  async function handleShare() {
    const url = video.source_url || `https://www.youtube.com/watch?v=${video.provider_video_id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: video.title, url });
        return;
      } catch {
        /* user dismissed the share sheet */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Couldn’t share this video");
    }
  }

  async function handleSave() {
    if (busy) return;
    if (!user) {
      toast("Sign in to save Reels to your library", {
        action: { label: "Sign in", onClick: () => navigateToLogin() },
      });
      return;
    }
    setBusy(true);
    try {
      const result = await toggleExternalLibrary({
        data: {
          provider: video.provider,
          providerVideoId: video.provider_video_id,
          title: video.title || "YouTube video",
          thumbnail: video.thumbnail_url ?? "",
          creator: video.creator_name ?? "",
          category: video.category ?? "",
          duration: video.duration_seconds ?? null,
          sourceUrl: video.source_url ?? "",
        },
      });
      onToggleSave(video.provider_video_id, result.saved);
      toast.success(result.saved ? "Saved to your Library" : "Removed from your Library");
    } catch {
      toast.error("Could not update your library");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-reel={index} className="flex h-full w-full snap-start snap-always items-center justify-center">
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-black md:aspect-[9/16] md:h-full md:w-auto md:rounded-2xl md:border md:border-border/50">
        {video.embeddable === false ? (
          <ReelUnavailable watchUrl={video.source_url} />
        ) : shouldMount ? (
          <ReelPlayer
            videoId={video.provider_video_id}
            title={video.title}
            active={active}
            embeddable={video.embeddable}
            watchUrl={video.source_url}
          />
        ) : (
          // Neighbouring reels stay light: just the thumbnail, no player.
          <Image
            src={video.thumbnail_url}
            alt=""
            fittingType="fill"
            className="h-full w-full opacity-70"
          />
        )}

        {/* Info overlay — kept at the bottom, over a dark gradient for contrast. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 via-black/45 to-transparent pb-5 pt-20 md:pb-6">
          <div className="pointer-events-auto flex items-end justify-between gap-3 px-4">
            <div className="min-w-0">
              {categoryLabel && (
                <span className="mb-2 inline-block rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
                  {categoryLabel}
                </span>
              )}
              <h2 className="line-clamp-2 text-sm font-bold leading-snug text-white drop-shadow sm:text-base">
                {video.title}
              </h2>
              <div className="mt-2 flex items-center gap-2">
                {video.channel_avatar_url && (
                  <Image
                    src={video.channel_avatar_url}
                    alt=""
                    fittingType="fill"
                    className="h-6 w-6 rounded-full border border-white/25 object-cover"
                  />
                )}
                <p className="truncate text-xs font-medium text-white/85">{video.creator_name}</p>
              </div>
              {video.description ? (
                <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-white/70">{video.description}</p>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-col items-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={handleSave}
                  aria-pressed={saved}
                  aria-label={saved ? "Remove from Library" : "Save to Library"}
                  disabled={busy}
                  className={cn(ACTION_BUTTON, saved && "text-primary")}
                >
                  {saved ? <BookmarkCheck className="h-5 w-5" aria-hidden="true" /> : <Bookmark className="h-5 w-5" aria-hidden="true" />}
                </button>
                <span className="text-[10px] font-medium text-white/80">{saved ? "Saved" : "Save"}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <button type="button" onClick={handleShare} aria-label="Share this video" className={ACTION_BUTTON}>
                  <Share2 className="h-5 w-5" aria-hidden="true" />
                </button>
                <span className="text-[10px] font-medium text-white/80">Share</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <a
                  href={video.source_url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Watch on YouTube"
                  className={ACTION_BUTTON}
                >
                  <ExternalLink className="h-5 w-5" aria-hidden="true" />
                </a>
                <span className="text-[10px] font-medium text-white/80">YouTube</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}