import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import Logo from "@/components/Logo";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { to: "/", label: "Home" },
  { to: "/search", label: "Search" },
  { to: "/reels", label: "Reels" },
  { to: "/library", label: "Library" },
  { to: "/downloads", label: "Downloads" },
  { to: "/me", label: "Me" },
];

function initials(user) {
  const source = user?.full_name || user?.email || "?";
  return source.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default function AppLayout({ children }) {
  const { user, isLoadingAuth, navigateToLogin } = useAuth();
  const pathname = useLocation({ select: (s) => s.pathname });
  const isActive = (to) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  const { data: unread } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => base44.entities.Notification.count({ read: false }),
    enabled: !!user,
    staleTime: 10_000,
  });

  return (
    <div className="min-h-screen bg-background">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground">
        Skip to content
      </a>
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
          <Link to="/" aria-label="VYBEX home" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Logo />
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "text-primary after:absolute after:inset-x-4 after:-bottom-[13px] after:h-0.5 after:rounded-full after:bg-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" asChild aria-label="Notifications">
              <Link to="/notifications" className="relative">
                <Bell className="h-5 w-5 text-muted-foreground" />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
            </Button>
            {isLoadingAuth ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-secondary" aria-hidden="true" />
            ) : user ? (
              <Link to="/me" aria-label="Your profile" className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarImage src={user.avatar_url || user.data?.avatar_url} alt="" />
                  <AvatarFallback className="bg-primary/20 text-xs font-bold text-primary">{initials(user)}</AvatarFallback>
                </Avatar>
              </Link>
            ) : (
              <Button size="sm" onClick={() => navigateToLogin()} className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90">
                Sign in
              </Button>
            )}
          </div>
        </div>
      </header>
      <main id="main-content" className="mx-auto w-full max-w-7xl px-4 pb-safe md:px-8 md:pb-14">
        {children ?? <Outlet />}
      </main>
      <Footer />
      <BottomNav items={NAV_ITEMS} isActive={isActive} />
    </div>
  );
}