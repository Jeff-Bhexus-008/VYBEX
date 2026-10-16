import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Image } from "@/components/ui/image";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import LibraryButton from "@/components/LibraryButton";
import { categoryLabel, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function HeroCarousel({ items, savedSlugs = [], onToggleSave }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [saved, setSaved] = useState(() => new Set(savedSlugs));

  useEffect(() => {
    setSaved(new Set(savedSlugs));
  }, [savedSlugs]);

  useEffect(() => {
    if (paused || items.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % items.length), 6500);
    return () => clearInterval(timer);
  }, [paused, items.length]);

  if (!items?.length) return null;
  const go = (dir) => setIndex((i) => (i + dir + items.length) % items.length);
  const current = items[index];
  const isSaved = saved.has(current.slug);
  const meta = [current.release_year, current.language, current.age_rating].filter(Boolean).join(" · ");

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured content"
      className="relative overflow-hidden rounded-2xl border border-border/50 bg-card shadow-soft"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative aspect-[16/9] w-full sm:aspect-[21/9]">
        {items.map((item, i) => (
          <div
            key={item.id}
            className={cn("absolute inset-0 transition-opacity duration-700", i === index ? "opacity-100" : "pointer-events-none opacity-0")}
            aria-hidden={i !== index}
          >
            <Image src={item.banner_url || item.thumbnail_url} alt="" className="h-full w-full object-cover" />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/30 to-transparent" aria-hidden="true" />
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/55 to-transparent" aria-hidden="true" />

        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-7 lg:p-10">
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            {current.is_demo && (
              <span className="rounded bg-black/60 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-foreground/90">Demo</span>
            )}
            <span className="rounded bg-primary/90 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground">
              {categoryLabel(current.category)}
            </span>
            {current.upcoming && (
              <span className="rounded bg-destructive/90 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-destructive-foreground">
                Coming Soon
              </span>
            )}
          </div>
          <h2 className="max-w-xl text-balance font-display text-2xl font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem]">
            {current.title}
          </h2>
          {meta && <p className="mt-1.5 text-xs font-medium uppercase tracking-wider text-foreground/70 sm:text-sm">{meta}</p>}
          {current.description && (
            <p className="mt-2 line-clamp-2 max-w-lg text-sm text-muted-foreground sm:text-base">{current.description}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button asChild className="bg-primary font-semibold text-primary-foreground shadow-glow hover:bg-primary/90">
              <Link to="/video/$slug" params={{ slug: current.slug }}>
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                {current.media_url ? "Watch Now" : "View Details"}
              </Link>
            </Button>
            <LibraryButton
              saved={isSaved}
              onToggle={onToggleSave ? () => onToggleSave(current) : undefined}
              variant="secondary"
              className="border-border/60 bg-black/45 backdrop-blur-sm hover:bg-black/65"
            />
            {current.duration_seconds ? (
              <span className="hidden items-center text-xs font-medium text-muted-foreground sm:flex">
                {formatDuration(current.duration_seconds)}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="absolute inset-y-0 left-0 flex items-center px-2 sm:px-3">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous featured item"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-foreground backdrop-blur-sm transition-colors hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className="absolute inset-y-0 right-0 flex items-center px-2 sm:px-3">
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next featured item"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-foreground backdrop-blur-sm transition-colors hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="absolute bottom-3 right-4 flex items-center gap-1" role="tablist" aria-label="Carousel position">
        {items.map((item, i) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Show ${item.title}`}
            onClick={() => setIndex(i)}
            className="group flex h-7 items-center px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              className={cn(
                "block h-1.5 rounded-full transition-all",
                i === index ? "w-7 bg-primary" : "w-3 bg-foreground/30 group-hover:bg-foreground/60",
              )}
            />
          </button>
        ))}
      </div>
    </section>
  );
}