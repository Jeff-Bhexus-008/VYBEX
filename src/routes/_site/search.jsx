import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, SearchX, X } from "lucide-react";
import { searchDiscover } from "@/lib/server-fns";
import { CATEGORIES } from "@/lib/format";
import VideoGrid from "@/components/VideoGrid";
import ProviderNotice from "@/components/ProviderNotice";
import EmptyState from "@/components/EmptyState";
import { GridSkeleton } from "@/components/Skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_site/search")({
  ssr: false,
  // Filters live in the URL so a search survives navigating to a video and back.
  validateSearch: (search) => ({
    q: typeof search.q === "string" ? search.q.slice(0, 120) : "",
    source: ["all", "youtube", "uploads"].includes(search.source) ? search.source : "all",
    category: typeof search.category === "string" ? search.category : "all",
    sort: ["relevance", "newest", "title"].includes(search.sort) ? search.sort : "relevance",
  }),
  head: () => ({ meta: [{ title: "Search — VYBEX" }] }),
  component: SearchPage,
});

const SOURCES = [
  { value: "all", label: "All Sources" },
  { value: "youtube", label: "YouTube" },
  { value: "uploads", label: "My Uploads" },
];

const SORTS = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest" },
  { value: "title", label: "Title A–Z" },
];

function SearchPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [input, setInput] = useState(search.q);
  const [cursor, setCursor] = useState({ yt: "" });
  const [pages, setPages] = useState([]);
  const inputRef = useRef(null);
  const filterKey = [search.q, search.source, search.category, search.sort].join("|");

  // Debounce the typed keyword into the URL.
  const lastSubmitted = useRef(search.q);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (input !== search.q) {
        lastSubmitted.current = input;
        navigate({ search: (prev) => ({ ...prev, q: input }), replace: true });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [input, search.q, navigate]);

  // When the query changes from outside typing (direct links, back/forward,
  // filter chips), resync the input box so a stale box never wipes the URL.
  useEffect(() => {
    if (search.q !== lastSubmitted.current) {
      lastSubmitted.current = search.q;
      setInput(search.q);
    }
  }, [search.q]);

  const setSearch = (patch) => navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });

  const { data, isPending, isFetching, isError, refetch } = useQuery({
    queryKey: ["discover", search.q, search.source, search.category, search.sort, cursor.yt],
    queryFn: () =>
      searchDiscover({
        data: {
          q: search.q,
          source: search.source,
          category: search.category,
          sort: search.sort,
          youtubePageToken: cursor.yt,
        },
      }),
    staleTime: 5 * 60 * 1000,
  });

  // New filters restart pagination; "Load more" pages accumulate.
  useEffect(() => {
    setCursor({ yt: "" });
  }, [filterKey]);

  useEffect(() => {
    if (!data) return;
    setPages((prev) => {
      const key = `${filterKey}|${cursor.yt}`;
      if (prev.some((p) => p.key === key)) return prev;
      return [...prev, { key, items: data.items }];
    });
  }, [data, filterKey, cursor.yt]);

  const items = [];
  const seen = new Set();
  for (const page of pages.filter((p) => p.key.startsWith(`${filterKey}|`))) {
    for (const item of page.items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      items.push(item);
    }
  }

  const youtubeIncluded = search.source === "all" || search.source === "youtube";
  const notices =
    youtubeIncluded && data && (data.youtube.status === "blocked" || data.youtube.status === "error")
      ? [{ provider: "youtube", status: data.youtube.status, error: data.youtube.error }]
      : [];

  // When YouTube isn't configured, the notice is the answer —
  // no fake results and no misleading "no results" message.
  const providerBlockedOnly =
    !items.length && !isPending && !isError && data && youtubeIncluded && data.youtube.status === "blocked";

  const canLoadMore = data && data.youtube.status === "ok" && data.youtube.nextPageToken;
  const loadMore = () => {
    setCursor((prev) => ({ yt: data.youtube.nextPageToken || prev.yt }));
  };

  const hasFilters = search.q !== "" || search.source !== "all" || search.category !== "all" || search.sort !== "relevance";
  const clearAll = () => {
    setInput("");
    setSearch({ q: "", source: "all", category: "all", sort: "relevance" });
  };

  return (
    <div className="pt-4">
      <h1 className="text-2xl font-extrabold tracking-tight">Search</h1>
      <div className="mt-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            ref={inputRef}
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search YouTube and VYBEX uploads…"
            aria-label="Search videos"
            className="h-12 pl-10 pr-10"
          />
          {input && (
            <button
              type="button"
              onClick={() => { setInput(""); inputRef.current?.focus(); }}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {SOURCES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setSearch({ source: s.value })}
            aria-pressed={search.source === s.value}
            className={cn(
              "h-9 rounded-full px-4 text-sm font-semibold transition-colors",
              search.source === s.value
                ? "bg-primary text-primary-foreground shadow-glow"
                : "bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Select value={search.category} onValueChange={(v) => setSearch({ category: v })}>
          <SelectTrigger className="h-9 w-[150px]" aria-label="Filter by category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={search.sort} onValueChange={(v) => setSearch({ sort: v })}>
          <SelectTrigger className="h-9 w-[140px]" aria-label="Sort results">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="text-muted-foreground">
            <X className="h-4 w-4" aria-hidden="true" /> Clear
          </Button>
        )}
        {data && !isPending && (
          <span className="ml-auto text-xs text-muted-foreground" aria-live="polite">
            {isFetching ? "Searching…" : `${items.length} ${items.length === 1 ? "result" : "results"}`}
          </span>
        )}
      </div>

      {notices.length > 0 && (
        <div className="mt-4 space-y-2">
          {notices.map((n) => (
            <ProviderNotice
              key="youtube"
              name="YouTube"
              status={n.status}
              error={n.error}
              onRetry={refetch}
            />
          ))}
        </div>
      )}

      <div className={`mt-6 transition-opacity ${isFetching && !isPending ? "opacity-60" : ""}`}>
        {isPending ? (
          <GridSkeleton count={8} />
        ) : isError ? (
          <EmptyState
            icon={SearchX}
            title="Something went wrong"
            description="We couldn't complete the search. Check your connection and try again."
            action={<Button onClick={() => refetch()} className="bg-primary text-primary-foreground hover:bg-primary/90">Try again</Button>}
          />
        ) : (
          <>
            <VideoGrid
              videos={items}
              emptyState={
                providerBlockedOnly ? null : (
                  <EmptyState
                    icon={SearchX}
                    title="No results found"
                    description={search.q
                      ? `Nothing matches “${search.q}” in the selected sources. Try a different keyword.`
                      : "Enter a keyword to search YouTube and VYBEX uploads."}
                    action={hasFilters ? (
                      <Button asChild variant="outline" onClick={clearAll}>
                        <Link to="/search">Clear filters</Link>
                      </Button>
                    ) : undefined}
                  />
                )
              }
            />
            {canLoadMore && (
              <div className="mt-6 flex justify-center">
                <Button variant="outline" onClick={loadMore} disabled={isFetching}>
                  {isFetching ? "Loading more…" : "Load more"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}