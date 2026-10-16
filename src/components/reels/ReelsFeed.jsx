import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Film, Loader2, SearchX } from "lucide-react";
import { getReels } from "@/lib/reels-fns";
import { reelsLabel } from "@/lib/reels";
import EmptyState from "@/components/EmptyState";
import ProviderNotice from "@/components/ProviderNotice";
import { Button } from "@/components/ui/button";
import ReelItem from "./ReelItem";

/**
 * The vertical Reels feed: TikTok-style snap scrolling with one playing reel
 * at a time, IntersectionObserver-driven activation, page-at-a-time loading
 * from YouTube, and honest provider status (never fabricated results).
 */
export default function ReelsFeed({ category }) {
  const containerRef = useRef(null);
  const [pages, setPages] = useState([]);
  const [pageToken, setPageToken] = useState("");
  const [mergedToken, setMergedToken] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [savedMap, setSavedMap] = useState({});

  const { data, isPending, isFetching, isError, refetch } = useQuery({
    queryKey: ["reels", category, pageToken],
    queryFn: () => getReels({ data: { category, pageToken } }),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // A category switch restarts the feed from the top.
  useEffect(() => {
    setPages([]);
    setPageToken("");
    setMergedToken("");
    setActiveIndex(0);
    setSavedMap({});
    containerRef.current?.scrollTo({ top: 0 });
  }, [category]);

  useEffect(() => {
    if (!data) return;
    setMergedToken(pageToken);
    setPages((prev) => {
      const key = `${category}|${pageToken}`;
      if (prev.some((p) => p.key === key)) return prev;
      return [...prev, { key, items: data.items ?? [] }];
    });
    setSavedMap((prev) => {
      const next = { ...prev };
      for (const item of data.items ?? []) {
        if (!(item.provider_video_id in next)) next[item.provider_video_id] = !!item.saved;
      }
      return next;
    });
  }, [data, category, pageToken]);

  const items = useMemo(() => {
    const seen = new Set();
    const merged = [];
    for (const page of pages) {
      for (const item of page.items) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        merged.push(item);
      }
    }
    return merged;
  }, [pages]);

  // The reel filling the viewport is the active one.
  useEffect(() => {
    const root = containerRef.current;
    if (!root || !items.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            setActiveIndex(Number(entry.target.getAttribute("data-reel")));
          }
        }
      },
      { root, threshold: 0.6 },
    );
    root.querySelectorAll("[data-reel]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items.length]);

  // Load the next page only when the user nears the end of the feed. The
  // items.length guard keeps this quiet until the first page has actually
  // rendered, and the token state means one request at a time, no duplicates.
  useEffect(() => {
    if (!data || data.status !== "ok" || !data.nextPageToken || isFetching) return;
    // Wait until the fetched page is actually merged into the feed — otherwise
    // the stale item count fires the next request the instant a page lands.
    if (mergedToken !== pageToken) return;
    if (items.length && activeIndex >= items.length - 3) setPageToken(data.nextPageToken);
  }, [activeIndex, items.length, data, isFetching, mergedToken, pageToken]);

  // Keyboard navigation between reels (Space/M are handled by the active player).
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const onKey = (e) => {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const dir = e.key === "ArrowDown" ? 1 : -1;
        const next = Math.min(items.length - 1, Math.max(0, activeIndex + dir));
        root.scrollTo({ top: next * root.clientHeight, behavior: "smooth" });
      }
    };
    root.addEventListener("keydown", onKey);
    return () => root.removeEventListener("keydown", onKey);
  }, [activeIndex, items.length]);

  const label = reelsLabel(category);
  const providerFailed = data && (data.status === "blocked" || data.status === "error");
  const isEmpty = data && data.status === "ok" && items.length === 0;

  return (
    <div
      ref={containerRef}
      role="feed"
      aria-label={`${label} reels`}
      tabIndex={0}
      className="no-scrollbar h-[calc(100dvh-9rem-env(safe-area-inset-bottom,0px))] snap-y snap-mandatory overflow-y-auto overscroll-contain bg-background/40 focus-visible:outline-none md:h-[calc(100dvh-7.5rem)]"
    >
      {isPending ? (
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-9 w-9 animate-spin text-primary" aria-hidden="true" />
            <p className="text-sm">Loading Reels…</p>
          </div>
        </div>
      ) : isError ? (
        <div className="flex h-full items-center justify-center px-4">
          <EmptyState
            icon={SearchX}
            title="Couldn’t load Reels"
            description="Something went wrong while reaching the feed. Check your connection and try again."
            action={
              <Button onClick={() => refetch()} className="bg-primary text-primary-foreground hover:bg-primary/90">
                Try again
              </Button>
            }
          />
        </div>
      ) : providerFailed ? (
        <div className="flex h-full items-center justify-center px-4">
          <ProviderNotice name="YouTube" status={data.status} error={data.error} onRetry={refetch} />
        </div>
      ) : isEmpty ? (
        <div className="flex h-full items-center justify-center px-4">
          <EmptyState
            icon={Film}
            title="No Reels right now"
            description={`We couldn’t find short videos for ${label}. Try another category.`}
          />
        </div>
      ) : (
        <>
          {items.map((video, index) => (
            <ReelItem
              key={video.id}
              video={video}
              index={index}
              active={index === activeIndex}
              shouldMount={Math.abs(index - activeIndex) <= 1}
              categoryLabel={label}
              saved={!!savedMap[video.provider_video_id]}
              onToggleSave={(videoId, isSaved) => setSavedMap((prev) => ({ ...prev, [videoId]: isSaved }))}
            />
          ))}
          <div className="flex h-24 items-center justify-center">
            {isFetching ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading more Reels" />
            ) : data && !data.nextPageToken ? (
              <p className="text-xs text-muted-foreground">You’ve reached the end of this feed</p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}