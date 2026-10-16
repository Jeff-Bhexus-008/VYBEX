import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Camera, Clock, LogOut, Trash2, Upload, ShieldCheck, Bell, Film } from "lucide-react";
import { toast } from "sonner";
import { getMyDashboard } from "@/lib/server-fns";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import ContentRow from "@/components/ContentRow";
import { formatDuration } from "@/lib/format";
import { Image } from "@/components/ui/image";

export const Route = createFileRoute("/_authed/me")({
  head: () => ({ meta: [{ title: "My Profile — VYBEX" }] }),
  component: MePage,
});

const STATUS_STYLES = {
  pending: "bg-primary/15 text-primary",
  published: "bg-emerald-500/15 text-emerald-400",
  rejected: "bg-destructive/15 text-destructive",
  draft: "bg-secondary text-muted-foreground",
};

function MePage() {
  const { user, refresh, logout } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const { data: dashboard, isPending } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getMyDashboard(),
  });

  const preferences = user?.preferences ?? user?.data?.preferences ?? {};
  const savePrefs = useMutation({
    mutationFn: (patch) => base44.auth.updateMe({ preferences: { ...preferences, ...patch } }),
    onSuccess: () => {
      toast.success("Preferences saved");
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      refresh();
    },
    onError: () => toast.error("Could not save preferences"),
  });

  const changeAvatar = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    if (file.size > 2 * 1024 * 1024) return toast.error("Image must be under 2 MB");
    setUploadingAvatar(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      await base44.auth.updateMe({ avatar_url: file_url });
      await refresh();
      toast.success("Avatar updated");
    } catch (err) {
      toast.error(err.message || "Could not upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const clearHistory = useMutation({
    mutationFn: () => base44.entities.WatchProgress.deleteMany({}),
    onSuccess: () => {
      toast.success("Watch history cleared");
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      router.invalidate();
    },
  });

  return (
    <div className="pt-4 pb-6">
      {/* Profile card */}
      <section className="flex flex-col items-center gap-4 rounded-2xl border border-border/60 bg-card/60 p-6 sm:flex-row sm:items-center">
        <div className="relative">
          <Avatar className="h-20 w-20 border-2 border-primary/40">
            <AvatarImage src={user?.avatar_url || user?.data?.avatar_url} alt="Your avatar" />
            <AvatarFallback className="bg-primary/20 text-xl font-bold text-primary">
              {(user?.full_name || user?.email || "?").slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploadingAvatar}
            aria-label="Change avatar"
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow transition-transform hover:scale-105"
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-label="Upload avatar image"
            onChange={(e) => changeAvatar(e.target.files?.[0])}
          />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-xl font-extrabold tracking-tight">{user?.full_name || "VYBEX member"}</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <p className="mt-1 text-xs text-muted-foreground/70 capitalize">Role: {user?.role ?? "user"}</p>
        </div>
        <Button variant="outline" onClick={() => logout()} className="border-border">
          <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
        </Button>
      </section>

      {/* Quick links */}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { to: "/upload", icon: Upload, label: "Upload" },
          { to: "/notifications", icon: Bell, label: "Notifications" },
          ...(user?.role === "admin" ? [{ to: "/admin", icon: ShieldCheck, label: "Admin" }] : []),
          { to: "/library", icon: Film, label: "Library" },
        ].map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-card/60 p-4 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <l.icon className="h-5 w-5" aria-hidden="true" />
            {l.label}
          </Link>
        ))}
      </section>

      {/* Continue watching */}
      {isPending ? (
        <div className="mt-8 h-32 animate-pulse rounded-xl bg-card/50" aria-hidden="true" />
      ) : dashboard?.continueWatching?.length ? (
        <ContentRow title="Continue Watching" videos={dashboard.continueWatching.map((p) => ({ ...p, badgeLabel: "Resume" }))} />
      ) : null}

      {/* Watch history */}
      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold tracking-tight">Watch History</h2>
          {!!dashboard?.history?.length && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" aria-hidden="true" /> Clear history
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all watch history?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes your playback positions and history across all devices. Continue Watching will reset. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => clearHistory.mutate()} className="bg-destructive text-primary-foreground hover:bg-destructive/90">
                    Clear history
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        {!isPending && !dashboard?.history?.length ? (
          <p className="mt-3 rounded-xl border border-dashed border-border bg-card/40 px-4 py-6 text-center text-sm text-muted-foreground">
            Nothing watched yet — your history and playback positions will appear here.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {dashboard?.history?.map((h) => {
              const isExternal = h.provider && h.provider !== "vybex";
              return (
              <li key={h.id}>
                <Link
                  to={isExternal ? "/external/$provider/$videoId" : "/video/$slug"}
                  params={isExternal ? { provider: h.provider, videoId: h.provider_video_id } : { slug: h.slug }}
                  className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/50 p-2.5 transition-colors hover:border-primary/40"
                >
                  <div className="h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-secondary">
                    {h.thumbnail_url ? <Image src={h.thumbnail_url} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{h.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {h.completed
                        ? "Watched"
                        : `Stopped at ${formatDuration(h.position_seconds)}${h.duration_seconds ? ` of ${formatDuration(h.duration_seconds)}` : ""}`}
                    </p>
                  </div>
                  <Clock className="h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden="true" />
                </Link>
              </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* My uploads */}
      <section className="mt-8">
        <h2 className="text-lg font-bold tracking-tight">My Uploads</h2>
        {!isPending && !dashboard?.uploads?.length ? (
          <p className="mt-3 rounded-xl border border-dashed border-border bg-card/40 px-4 py-6 text-center text-sm text-muted-foreground">
            No submissions yet.{" "}
            <Link to="/upload" className="font-semibold text-primary hover:underline">Upload your first video</Link> — it will be
            reviewed before appearing publicly.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {dashboard?.uploads?.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-card/50 p-3">
                <div className="min-w-0">
                  <Link to="/video/$slug" params={{ slug: u.slug }} className="truncate text-sm font-semibold hover:text-primary">
                    {u.title}
                  </Link>
                  {u.moderation_note ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{u.moderation_note}</p> : null}
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[u.status] ?? "bg-secondary text-muted-foreground"}`}>
                  {u.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Preferences */}
      <section className="mt-8 rounded-2xl border border-border/60 bg-card/50 p-5">
        <h2 className="text-base font-bold tracking-tight">Preferences & Privacy</h2>
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="pref-autoplay" className="text-sm font-medium">Autoplay videos</Label>
              <p className="text-xs text-muted-foreground">Start playback as soon as a title opens.</p>
            </div>
            <Switch
              id="pref-autoplay"
              checked={preferences.autoplay === true}
              onCheckedChange={(v) => savePrefs.mutate({ autoplay: v })}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="pref-activity" className="text-sm font-medium">Save watch activity</Label>
              <p className="text-xs text-muted-foreground">Keep your playback position and Continue Watching. Turn off for private viewing.</p>
            </div>
            <Switch
              id="pref-activity"
              checked={preferences.save_activity !== false}
              onCheckedChange={(v) => savePrefs.mutate({ save_activity: v })}
            />
          </div>
        </div>
      </section>
    </div>
  );
}