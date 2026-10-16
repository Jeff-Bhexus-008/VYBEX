import { Link } from "@tanstack/react-router";
import { Bookmark, Clapperboard, Download, Home, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = { "/": Home, "/search": Search, "/reels": Clapperboard, "/library": Bookmark, "/downloads": Download, "/me": User };

export default function BottomNav({ items, isActive }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-card/95 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="grid grid-cols-6">
        {items.map((item) => {
          const Icon = ICONS[item.to] ?? Home;
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-[3.75rem] flex-col items-center justify-center gap-1 px-2 pt-1.5 pb-1.5 text-[11px] font-medium transition-colors focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                  active && "bg-primary/15",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}