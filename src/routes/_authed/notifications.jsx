import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellOff, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authed/notifications")({
  head: () => ({ meta: [{ title: "Notifications — VYBEX" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data: notifications, isPending, isError } = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: async () => (await base44.entities.Notification.filter({}, { sort: "-created_date", limit: 50 })).items,
  });

  const markRead = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAll = useMutation({
    mutationFn: () => base44.entities.Notification.updateMany({ read: false }, { $set: { read: true } }),
    onSuccess: () => {
      toast.success("All notifications marked as read");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markOne = (n) => {
    if (!n.read) markRead.mutate(n.id);
  };

  const unread = notifications?.filter((n) => !n.read).length ?? 0;

  return (
    <div className="pt-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Notifications</h1>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
            <CheckCheck className="h-4 w-4" aria-hidden="true" /> Mark all read
          </Button>
        )}
      </div>

      <div className="mt-6 space-y-2">
        {isPending ? (
          <div className="space-y-2" aria-hidden="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-card/60" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={BellOff}
            title="Couldn't load notifications"
            description="Check your connection and try again."
            action={<Button onClick={() => queryClient.invalidateQueries({ queryKey: ["notifications"] })} className="bg-primary text-primary-foreground">Try again</Button>}
          />
        ) : !notifications?.length ? (
          <EmptyState
            icon={BellOff}
            title="No notifications yet"
            description="You'll hear about upload reviews, account events and new features here."
          />
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => markOne(n)}
              className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                n.read ? "border-border/50 bg-card/40" : "border-primary/40 bg-primary/10"
              }`}
            >
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-muted-foreground/30" : "bg-primary"}`}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-foreground">{n.message}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{timeAgo(n.created_date)}</span>
                {n.video_slug ? (
                  <Link
                    to="/video/$slug"
                    params={{ slug: n.video_slug }}
                    className="mt-1 inline-block text-xs font-semibold text-primary hover:underline"
                  >
                    Open title
                  </Link>
                ) : null}
              </span>
              {!n.read && <span className="shrink-0 text-[10px] font-semibold uppercase text-primary">New</span>}
            </button>
          ))
        )}
      </div>
    </div>
  );
}