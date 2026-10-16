import { Link, useLocation } from "@tanstack/react-router";
import { CATEGORIES } from "@/lib/format";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "For You", to: "/" },
  { label: "Trending", to: "/category/trending" },
  ...CATEGORIES.map((c) => ({ label: c.label, to: `/category/${c.slug}` })),
];

export default function CategoryTabs() {
  const pathname = useLocation({ select: (s) => s.pathname });
  return (
    <div role="tablist" aria-label="Content categories" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-3 md:mx-0 md:px-0">
      {TABS.map((tab) => {
        const active = tab.to === "/" ? pathname === "/" : pathname.startsWith(tab.to);
        return (
          <Link
            key={tab.to}
            to={tab.to}
            role="tab"
            aria-selected={active}
            className={cn(
              "flex min-h-9 shrink-0 items-center rounded-full border px-4 text-[13px] font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border-primary bg-primary text-primary-foreground shadow-glow"
                : "border-border/70 bg-card/70 text-muted-foreground hover:border-primary/40 hover:bg-card hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}