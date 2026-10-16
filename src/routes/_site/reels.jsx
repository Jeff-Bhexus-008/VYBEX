import { createFileRoute, useNavigate } from "@tanstack/react-router";
import ReelsFeed from "@/components/reels/ReelsFeed";
import { REELS_CATEGORIES } from "@/lib/reels";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_site/reels")({
  ssr: false, // the feed plays in the browser and saving reads the signed-in user
  // No default is injected into the URL: an absent category resolves at render
  // time (below), so /reels doesn't bounce to /reels?category=foryou. Unknown
  // categories pass through so the feed can answer honestly with an error.
  validateSearch: (search) => ({
    category: typeof search.category === "string" && search.category.length <= 30 ? search.category : undefined,
  }),
  head: () => ({ meta: [{ title: "Reels — VYBEX" }] }),
  component: ReelsPage,
});

function ReelsPage() {
  const category = Route.useSearch().category || "foryou";
  const navigate = useNavigate();

  return (
    <div className="-mx-4 md:-mx-8">
      <h1 className="sr-only">Reels</h1>
      <div className="relative">
        {/* Category chips float over the feed, out of the snap flow. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center p-2">
          <div className="no-scrollbar pointer-events-auto flex max-w-full gap-1.5 overflow-x-auto rounded-full border border-border/60 bg-black/50 p-1 backdrop-blur-md">
            {REELS_CATEGORIES.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => navigate({ search: (prev) => ({ ...prev, category: c.slug }), replace: true })}
                aria-pressed={category === c.slug}
                className={cn(
                  "whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  category === c.slug
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : "text-foreground/80 hover:bg-white/10",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <ReelsFeed category={category} />
      </div>
    </div>
  );
}