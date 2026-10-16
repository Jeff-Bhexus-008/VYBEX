import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import VideoCard from "@/components/VideoCard";

export default function ContentRow({ title, videos, seeAllTo, caption, variant }) {
  const scroller = useRef(null);
  if (!videos?.length) return null;

  const scrollBy = (dir) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section className="mt-8" aria-label={title}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2.5 font-heading text-lg font-bold tracking-tight text-foreground">
          <span className="h-5 w-1 rounded-full bg-primary" aria-hidden="true" />
          {title}
        </h2>
        <div className="flex items-center gap-1">
          {seeAllTo && (
            <Link
              to={seeAllTo}
              params={{}}
              className="mr-1 flex min-h-9 items-center gap-0.5 text-sm font-medium text-primary transition-colors hover:text-primary/80 focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              See All
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
          <div className="hidden gap-1.5 md:flex">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              aria-label={`Scroll ${title} backwards`}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-card text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              aria-label={`Scroll ${title} forwards`}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-card text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
      {caption && <p className="mt-1 text-xs text-muted-foreground/80">{caption}</p>}
      <div
        ref={scroller}
        className="no-scrollbar -mx-4 mt-3 flex snap-x gap-3.5 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0"
      >
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} variant={variant} />
        ))}
      </div>
    </section>
  );
}