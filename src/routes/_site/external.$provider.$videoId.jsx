import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { getExternalVideo, toggleExternalLibrary } from "@/lib/server-fns";
import YouTubePlayer from "@/components/YouTubePlayer";
import LibraryButton from "@/components/LibraryButton";
import ProviderNotice from "@/components/ProviderNotice";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/format";

export const Route = createFileRoute("/_site/external/$provider/$videoId")({
  ssr: false, // reads the signed-in user for library and watch progress
  loader: async ({ params }) => {
    if (params.provider !== "youtube") throw notFound();
    const detail = await getExternalVideo({ data: { provider: "youtube", videoId: params.videoId } });
    if (detail.status === "notfound") throw notFound();
    return detail;
  },
  head: ({ loaderData }) => ({
    meta: [loaderData?.video ? { title: `${loaderData.video.title} — VYBEX` } : { title: "VYBEX" }],
  }),
  component: ExternalVideoPage,
});

function ExternalVideoPage() {
  const detail = Route.useLoaderData();
  const { provider } = Route.useParams();
  const router = useRouter();
  const name = "YouTube";
  const [saved, setSaved] = useState(detail.status === "ok" ? detail.inLibrary : false);
  const [busy, setBusy] = useState(false);

  if (detail.status !== "ok") {
    return (
      <div className="pt-10">
        <ProviderNotice
          name={name}
          status={detail.status}
          error={detail.error}
          onRetry={detail.status === "error" ? () => router.invalidate() : undefined}
        />
      </div>
    );
  }

  const { video, progress } = detail;
  const resumeAt = progress?.position_seconds > 5 && !progress?.completed ? progress.position_seconds : 0;

  async function handleToggleSave() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await toggleExternalLibrary({
        data: {
          provider: video.provider,
          providerVideoId: video.provider_video_id,
          title: video.title,
          thumbnail: video.thumbnail_url ?? "",
          creator: video.creator_name ?? "",
          category: video.category ?? "",
          duration: video.duration_seconds ?? null,
          sourceUrl: video.source_url ?? "",
        },
      });
      setSaved(result.saved);
      toast.success(result.saved ? "Added to your Library" : "Removed from your Library");
    } catch (err) {
      toast.error(err.message || "Could not update your library");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pt-4">
      <div className="overflow-hidden rounded-xl">
        <YouTubePlayer
          videoId={video.provider_video_id}
          title={video.title}
          startAt={resumeAt}
          embeddable={video.embeddable}
        />
      </div>

      <div className="mt-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-semibold text-destructive">
            {name}
          </span>
          {video.duration_seconds ? (
            <span className="text-xs text-muted-foreground">{formatDuration(video.duration_seconds)}</span>
          ) : null}
          {video.published_at ? (
            <span className="text-xs text-muted-foreground">
              {new Date(video.published_at).toLocaleDateString("en-US", { timeZone: "UTC" })}
            </span>
          ) : null}
        </div>

        <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{video.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{video.creator_name}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <LibraryButton saved={saved} busy={busy} onToggle={handleToggleSave} />
          <Button asChild variant="outline" size="sm">
            <a href={video.source_url} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Open on {name}
            </a>
          </Button>
        </div>

        {video.description ? (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground line-clamp-4">{video.description}</p>
        ) : null}

        <p className="mt-4 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
          Plays through the official YouTube embedded player. Availability, ads and playback controls are set by YouTube and the video owner.
        </p>
        <p className="mt-2 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
          Offline downloads aren't available for YouTube videos — VYBEX can't legally store copies of YouTube content.
          YouTube's own app may offer an official download option; use “Open on YouTube” to check.
        </p>
      </div>
    </div>
  );
}