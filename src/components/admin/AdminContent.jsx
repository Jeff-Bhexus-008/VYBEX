import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Star, Trash2, UploadCloud } from "lucide-react";
import { moderateVideo, adminUpdateVideo, adminCreateVideo } from "@/lib/server-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CATEGORIES, categoryLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function AdminContent({ items, invalidate }) {
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);

  const act = useMutation({
    mutationFn: ({ videoId, action }) => moderateVideo({ data: { videoId, action } }),
    onSuccess: (_d, vars) => {
      toast.success(vars.action === "delete" ? "Content removed" : "Updated");
      invalidate();
    },
    onError: (err) => toast.error(err.message || "Action failed"),
  });

  const update = useMutation({
    mutationFn: (patch) => adminUpdateVideo({ data: patch }),
    onSuccess: () => {
      toast.success("Content updated");
      setEditing(null);
      invalidate();
    },
    onError: (err) => toast.error(err.message || "Update failed"),
  });

  if (!items?.length) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card/40 px-4 py-10 text-center text-sm text-muted-foreground">
        No published content yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAdding(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" aria-hidden="true" /> Add content
        </Button>
        <AddDialog open={adding} setOpen={setAdding} invalidate={invalidate} />
      </div>
      <ul className="space-y-2">
        {items.map((v) => (
          <li key={v.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card/60 p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{v.title}</p>
              <p className="text-xs text-muted-foreground">
                {categoryLabel(v.category)} · {v.is_demo ? "Demo" : "Regular"} · {v.upcoming ? "Upcoming" : "Playable"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                aria-label={v.featured ? "Remove from featured" : "Add to featured"}
                title={v.featured ? "Unfeature" : "Feature in hero"}
                onClick={() => act.mutate({ videoId: v.id, action: v.featured ? "unfeature" : "feature" })}
                disabled={act.isPending}
              >
                <Star className={cn("h-4 w-4", v.featured ? "fill-primary text-primary" : "text-muted-foreground")} aria-hidden="true" />
              </Button>
              <Button size="icon" variant="ghost" aria-label={`Edit ${v.title}`} onClick={() => setEditing(v)}>
                <Pencil className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-border"
                onClick={() => act.mutate({ videoId: v.id, action: "unpublish" })}
                disabled={act.isPending}
              >
                Unpublish
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" aria-label={`Delete ${v.title}`}>
                    <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete “{v.title}”?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes the title from VYBEX. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => act.mutate({ videoId: v.id, action: "delete" })} className="bg-destructive text-primary-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </li>
        ))}
      </ul>

      {editing && (
        <EditDialog video={editing} onClose={() => setEditing(null)} onSave={(patch) => update.mutate({ videoId: editing.id, ...patch })} busy={update.isPending} />
      )}
    </div>
  );
}

function EditDialog({ video, onClose, onSave, busy }) {
  const [form, setForm] = useState({
    title: video.title ?? "",
    description: video.description ?? "",
    category: video.category,
    featured: !!video.featured,
    upcoming: !!video.upcoming,
    thumbnail_url: video.thumbnail_url ?? "",
    banner_url: video.banner_url ?? "",
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit content</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ed-title">Title</Label>
            <Input id="ed-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} maxLength={120} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ed-desc">Description</Label>
            <Textarea id="ed-desc" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} maxLength={2000} />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
              <SelectTrigger aria-label="Category"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.slug} value={c.slug}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ed-thumb">Thumbnail URL</Label>
              <Input id="ed-thumb" value={form.thumbnail_url} onChange={(e) => setForm((f) => ({ ...f, thumbnail_url: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ed-banner">Banner URL</Label>
              <Input id="ed-banner" value={form.banner_url} onChange={(e) => setForm((f) => ({ ...f, banner_url: e.target.value }))} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Switch id="ed-featured" checked={form.featured} onCheckedChange={(v) => setForm((f) => ({ ...f, featured: v }))} />
              <Label htmlFor="ed-featured" className="text-sm">Featured in hero</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="ed-upcoming" checked={form.upcoming} onCheckedChange={(v) => setForm((f) => ({ ...f, upcoming: v }))} />
              <Label htmlFor="ed-upcoming" className="text-sm">Upcoming (no media)</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            disabled={busy || form.title.trim().length < 2}
            onClick={() => onSave({
              title: form.title.trim(),
              description: form.description,
              category: form.category,
              featured: form.featured,
              upcoming: form.upcoming,
              thumbnail_url: form.thumbnail_url,
              banner_url: form.banner_url,
            })}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddDialog({ open, setOpen, invalidate }) {
  const [form, setForm] = useState({
    title: "", description: "", category: "movies", media_url: "",
    thumbnail_url: "", banner_url: "", content_type: "video", featured: false, upcoming: false,
    creator_name: "VYBEX", language: "English", age_rating: "", source_label: "", duration_seconds: "",
  });

  const create = useMutation({
    mutationFn: () =>
      adminCreateVideo({
        data: {
          title: form.title.trim(),
          description: form.description,
          category: form.category,
          media_url: form.media_url.trim(),
          thumbnail_url: form.thumbnail_url.trim(),
          banner_url: form.banner_url.trim(),
          content_type: form.content_type,
          creator_name: form.creator_name.trim() || "VYBEX",
          featured: form.featured,
          upcoming: form.upcoming,
          language: form.language.trim() || "English",
          age_rating: form.age_rating,
          source_label: form.source_label.trim(),
          duration_seconds: form.duration_seconds ? Number(form.duration_seconds) : undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Content added and published");
      setOpen(false);
      setForm((f) => ({ ...f, title: "", description: "", media_url: "", thumbnail_url: "", banner_url: "" }));
      invalidate();
    },
    onError: (err) => toast.error(err.message || "Could not add content"),
  });

  const valid = form.title.trim().length >= 2 && (!!form.upcoming || /^https?:\/\//.test(form.media_url.trim()));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UploadCloud className="h-4 w-4 text-primary" aria-hidden="true" /> Add catalogue content</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="add-title">Title *</Label>
            <Input id="add-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} maxLength={120} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-desc">Description</Label>
            <Textarea id="add-desc" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} maxLength={2000} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger aria-label="Category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.content_type} onValueChange={(v) => setForm((f) => ({ ...f, content_type: v }))}>
                <SelectTrigger aria-label="Type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="short">Short</SelectItem>
                  <SelectItem value="trailer">Trailer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-media">Media URL {form.upcoming ? "(not needed for upcoming)" : "*"}</Label>
            <Input id="add-media" value={form.media_url} onChange={(e) => setForm((f) => ({ ...f, media_url: e.target.value }))} placeholder="https://… (authorised media only)" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="add-thumb">Thumbnail URL</Label>
              <Input id="add-thumb" value={form.thumbnail_url} onChange={(e) => setForm((f) => ({ ...f, thumbnail_url: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-banner">Banner URL</Label>
              <Input id="add-banner" value={form.banner_url} onChange={(e) => setForm((f) => ({ ...f, banner_url: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="add-creator">Creator</Label>
              <Input id="add-creator" value={form.creator_name} onChange={(e) => setForm((f) => ({ ...f, creator_name: e.target.value }))} maxLength={80} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-source">Source label</Label>
              <Input id="add-source" value={form.source_label} onChange={(e) => setForm((f) => ({ ...f, source_label: e.target.value }))} maxLength={120} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-dur">Duration (s)</Label>
              <Input id="add-dur" type="number" min={0} value={form.duration_seconds} onChange={(e) => setForm((f) => ({ ...f, duration_seconds: e.target.value }))} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Switch id="add-featured" checked={form.featured} onCheckedChange={(v) => setForm((f) => ({ ...f, featured: v }))} />
              <Label htmlFor="add-featured" className="text-sm">Featured in hero</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="add-upcoming" checked={form.upcoming} onCheckedChange={(v) => setForm((f) => ({ ...f, upcoming: v }))} />
              <Label htmlFor="add-upcoming" className="text-sm">Upcoming (no media)</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" disabled={!valid || create.isPending} onClick={() => create.mutate()} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {create.isPending ? "Adding…" : "Add & publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}