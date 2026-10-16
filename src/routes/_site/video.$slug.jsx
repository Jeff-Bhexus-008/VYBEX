import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Flag } from "lucide-react";
import { getVideoDetail, toggleLibrary, saveWatchProgress } from "@/lib/server-fns";
import VideoPlayer from "@/components/VideoPlayer";
import VideoGrid from "@/components/VideoGrid";
import LibraryButton from "@/components/LibraryButton";
import DownloadButton from "@/components/downloads/DownloadButton";
import { categoryLabel, formatDuration } from "@/lib/format";
import { useAuth } from "@/lib/AuthContext";

export const Route = createFileRoute("/_site/video/$slug")({
  loader: async ({ params }) => {
    const detail = await getVideoDetail({ data: { slug: params.slug } });
    if (!detail) throw notFound();
    return detail;
  },
  head: ({ loaderData }) => ({
    meta: loaderData?.video ? [{ title: `${loaderData.video.title} — VYBEX` }] : [{ title: "VYBEX" }],
  }),
  component: VideoDetailPage,
});

function VideoDetailPage() {
  const detail = Route.useLoaderData();
  const { video, related, playback_url, progress } = detail;
  const { user } = useAuth();
  const [saved, setSaved] = useState(detail.inLibrary);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);

  const preferences = user?.preferences ?? user?.data?.preferences ?? {};
  const saveActivity = preferences.save_activity !== false;

  async function handleToggleSave() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await toggleLibrary({ data: { videoId: video.id } });
      setSaved(result.saved);
      toast.success(result.saved ? "Added to your Library" : "Removed from your Library");
    } catch (err) {
      toast.error(err.message || "Could not update your library");
    } finally {
      setBusy(false);
    }
  }

  async function handleProgress({ position, duration, completed }) {
    if (!user || !saveActivity || saving.current) return;
    saving.current = true;
    try {
      await saveWatchProgress({ data: { videoId: video.id, position, duration, completed } });
    } catch {
      /* progress saving is best-effort */
    } finally {
      saving.current = false;
    }
  }

  const resumeAt = progress?.position_seconds > 5 && !progress?.completed ? progress.position_seconds : 0;

  return (
    <div className="pt-4">
      <div className="overflow-hidden rounded-xl">
        <VideoPlayer
          src={video.upcoming ? null : playback_url}
          poster={video.thumbnail_url}
          startAt={resumeAt}
          autoPlay={preferences.autoplay === true}
          onProgress={handleProgress}
        />
      </div>

      <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/category/$slug"
              params={{ slug: video.category }}
              className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/25"
            >
              {categoryLabel(video.category)}
            </Link>
            {video.is_demo && (
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Demo content
              </span>
            )}
            {video.content_type && (
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium capitalize text-muted-foreground">
                {video.content_type}
              </span>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{video.title}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {video.creator_name && <span>{video.creator_name}</span>}
            {video.duration_seconds ? <span>{formatDuration(video.duration_seconds)}</span> : null}
            {video.language && <span>{video.language}</span>}
            {video.age_rating && <span>{video.age_rating}</span>}
            {video.release_year && <span>{video.release_year}</span>}
          </p>
          {video.description && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{video.description}</p>}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <LibraryButton saved={saved} busy={busy} onToggle={handleToggleSave} />
            <DownloadButton video={video} />
            {video.status !== "published" && (
              <span className="rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-muted-foreground">
                Status: <span className="capitalize text-foreground">{video.status}</span> — visible to you and reviewers only
              </span>
            )}
            <Link
              to="/report"
              search={{ video: video.slug }}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
            >
              <Flag className="h-3.5 w-3.5" aria-hidden="true" /> Report this title
            </Link>
          </div>

          {video.source_label && (
            <p className="mt-3 text-xs text-muted-foreground/70">Source: {video.source_label}</p>
          )}
          {resumeAt > 0 && (
            <p className="mt-3 rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
              Resuming from {formatDuration(resumeAt)}
            </p>
          )}
          {video.upcoming && (
            <p className="mt-3 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
              This is an announced title. A trailer or stream is not available yet.
            </p>
          )}
        </div>

        <aside aria-label="Details">
          <div className="rounded-xl border border-border/60 bg-card/60 p-4">
            <h2 className="text-sm font-bold text-foreground">Details</h2>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Category</dt>
                <dd className="text-right text-foreground">{categoryLabel(video.category)}</dd>
              </div>
              {video.genres?.length ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Tags</dt>
                  <dd className="text-right text-foreground">{video.genres.join(", ")}</dd>
                </div>
              ) : null}
              {video.duration_seconds ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Duration</dt>
                  <dd className="text-right text-foreground">{formatDuration(video.duration_seconds)}</dd>
                </div>
              ) : null}
              {video.language ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Language</dt>
                  <dd className="text-right text-foreground">{video.language}</dd>
                </div>
              ) : null}
              {video.age_rating ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Age rating</dt>
                  <dd className="text-right text-foreground">{video.age_rating}</dd>
                </div>
              ) : null}
            </dl>
            {!user && (
              <p className="mt-4 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                Sign in to save this title and keep your place across devices.
              </p>
            )}
          </div>
        </aside>
      </div>

      {related?.length ? (
        <section className="mt-10" aria-label="Related titles">
          <h2 className="text-lg font-bold tracking-tight">More like this</h2>
          <div className="mt-4">
            <VideoGrid videos={related} />
          </div>
        </section>
      ) : null}
    </div>
  );
}