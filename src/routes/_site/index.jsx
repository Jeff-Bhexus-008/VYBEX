import { useRef, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { getHomeData, toggleLibrary } from "@/lib/server-fns";
import CategoryTabs from "@/components/CategoryTabs";
import HeroCarousel from "@/components/HeroCarousel";
import ContentRow from "@/components/ContentRow";
import { HeroSkeleton, RowSkeleton } from "@/components/Skeletons";

export const Route = createFileRoute("/_site/")({
  loader: () => getHomeData(),
  head: () => ({
    meta: [
      { title: "VYBEX — Watch. Discover. Repeat." },
      { name: "description", content: "Discover and watch videos across anime, animation, comedy, music, sports, shorts, movies and more on VYBEX." },
    ],
  }),
  component: HomePage,
});

export const PendingComponent = () => (
  <div className="pt-1">
    <div className="h-[52px]" aria-hidden="true" />
    <HeroSkeleton />
    <RowSkeleton />
  </div>
);

function HomePage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [savedSlugs, setSavedSlugs] = useState(data.savedSlugs ?? []);
  const saving = useRef(false);

  if (!data) return <PendingComponent />;

  const toggleSave = async (item) => {
    if (saving.current) return;
    saving.current = true;
    try {
      const result = await toggleLibrary({ data: { videoId: item.id } });
      setSavedSlugs((prev) =>
        result.saved ? [...new Set([...prev, item.slug])] : prev.filter((s) => s !== item.slug),
      );
      toast.success(result.saved ? "Added to your Library" : "Removed from your Library");
      router.invalidate();
    } catch (err) {
      toast.error(err.message || "Could not update your library");
    } finally {
      saving.current = false;
    }
  };

  return (
    <div className="pt-1">
      <CategoryTabs />
      {data.featured?.length ? <HeroCarousel items={data.featured} savedSlugs={savedSlugs} onToggleSave={toggleSave} /> : null}
      <div className="mt-1">
        {data.rows?.map((row) => (
          <ContentRow
            key={row.key}
            title={row.title}
            videos={row.videos}
            seeAllTo={row.seeAllTo}
            caption={row.caption}
            variant={row.key === "sports" ? "event" : undefined}
          />
        ))}
      </div>
      <p className="mt-10 rounded-xl border border-border/60 bg-card/50 px-4 py-3 text-center text-xs text-muted-foreground">
        Titles badged “Demo” are demonstration records streamed from public sample clips, shown for platform preview.
        Replace them with licensed or user-uploaded content.
      </p>
    </div>
  );
}