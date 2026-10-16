import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getCategoryVideos } from "@/lib/server-fns";
import VideoGrid from "@/components/VideoGrid";
import EmptyState from "@/components/EmptyState";
import { GridSkeleton } from "@/components/Skeletons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "@tanstack/react-router";
import { Compass } from "lucide-react";

export const Route = createFileRoute("/_site/category/$slug")({
  validateSearch: (s) => ({ sort: s.sort === "title" ? "title" : undefined }),
  loaderDeps: ({ search: { sort } }) => ({ sort: sort ?? "newest" }),
  loader: ({ params: { slug }, deps: { sort } }) => getCategoryVideos({ data: { slug, sort } }),
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.label ?? "Category"} — VYBEX` }] }),
  component: CategoryPage,
});

export const PendingComponent = () => (
  <div className="pt-6">
    <GridSkeleton count={10} />
  </div>
);

function CategoryPage() {
  const { label, videos, slug } = Route.useLoaderData();
  const navigate = useNavigate({ from: "/category/$slug" });

  return (
    <div className="pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 font-heading text-2xl font-extrabold tracking-tight">
            <span className="h-6 w-1.5 rounded-full bg-primary" aria-hidden="true" />
            {label}
          </h1>
          <p className="mt-1 pl-[18px] text-sm text-muted-foreground">
            {videos?.length ?? 0} {videos?.length === 1 ? "title" : "titles"}
          </p>
        </div>
        <Select
          value={Route.useSearch().sort ?? "newest"}
          onValueChange={(value) => navigate({ search: { sort: value === "title" ? "title" : undefined } })}
        >
          <SelectTrigger className="h-9 w-[150px]" aria-label="Sort titles">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="title">Title A–Z</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {slug === "sports" && !!videos?.length && (
        <p className="mt-2 text-xs text-muted-foreground/80">
          Sample demo fixtures only — connect a licensed sports data source for live events.
        </p>
      )}
      <div className="mt-8">
        <VideoGrid
          videos={videos}
          emptyState={
            <EmptyState
              icon={Compass}
              title={`Nothing in ${label} yet`}
              description="This category has no published titles right now. Check back soon or explore other categories."
              action={
                <Link to="/" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                  Browse Home
                </Link>
              }
            />
          }
        />
      </div>
    </div>
  );
}