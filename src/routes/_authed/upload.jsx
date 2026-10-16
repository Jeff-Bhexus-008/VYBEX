import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, CloudUpload, X } from "lucide-react";
import { toast } from "sonner";
import { submitUpload } from "@/lib/server-fns";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CATEGORIES, formatDuration } from "@/lib/format";
import { Image } from "@/components/ui/image";

export const Route = createFileRoute("/_authed/upload")({
  head: () => ({ meta: [{ title: "Upload a video — VYBEX" }] }),
  component: UploadPage,
});

const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // configurable size limit
const MAX_THUMB_BYTES = 5 * 1024 * 1024;
const AGE_RATINGS = ["", "G", "PG", "PG-13", "16+", "18+"];

function UploadPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [contentType, setContentType] = useState("video");
  const [genres, setGenres] = useState("");
  const [language, setLanguage] = useState("English");
  const [ageRating, setAgeRating] = useState("");
  const [allowDownload, setAllowDownload] = useState(false);
  const [file, setFile] = useState(null);
  const [thumbFile, setThumbFile] = useState(null);
  const [thumbPreview, setThumbPreview] = useState(null);
  const [duration, setDuration] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  const pickFile = (f) => {
    setDone(null);
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      toast.error("Please choose a video file (mp4, webm, mov…)");
      return;
    }
    if (f.size > MAX_VIDEO_BYTES) {
      toast.error("Video is too large — the limit is 200 MB");
      return;
    }
    setFile(f);
    const url = URL.createObjectURL(f);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.src = url;
    probe.onloadedmetadata = () => {
      if (probe.duration && isFinite(probe.duration)) setDuration(Math.round(probe.duration));
      URL.revokeObjectURL(url);
    };
  };

  const pickThumb = (f) => {
    setDone(null);
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Please choose an image file for the thumbnail");
      return;
    }
    if (f.size > MAX_THUMB_BYTES) {
      toast.error("Thumbnail is too large — the limit is 5 MB");
      return;
    }
    setThumbFile(f);
    setThumbPreview(URL.createObjectURL(f));
  };

  const valid = title.trim().length >= 2 && !!category && !!file;

  async function submit(e) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    try {
      // Media is stored privately; it becomes accessible only to you and reviewers.
      const media = await base44.integrations.Core.UploadPrivateFile({ file });
      let thumbnail_url = "";
      if (thumbFile) {
        const thumb = await base44.integrations.Core.UploadPublicFile({ file: thumbFile });
        thumbnail_url = thumb.file_url;
      }
      const result = await submitUpload({
        data: {
          title: title.trim(),
          description: description.trim(),
          category,
          genres: genres.split(",").map((g) => g.trim()).filter(Boolean).slice(0, 8),
          content_type: contentType,
          downloadable: allowDownload,
          media_uri: media.file_uri,
          thumbnail_url,
          language: language.trim() || "English",
          age_rating: ageRating,
          duration_seconds: duration ?? null,
        },
      });
      setDone({ title: title.trim(), slug: result.slug });
      setTitle(""); setDescription(""); setCategory(""); setGenres("");
      setAllowDownload(false);
      setFile(null); setThumbFile(null); setThumbPreview(null); setDuration(null);
      toast.success("Upload submitted for review");
    } catch (err) {
      toast.error(err.message || "Upload failed — please try again");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl pt-16 text-center animate-fade-in">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
          <CheckCircle2 className="h-8 w-8 text-primary" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Submitted for review</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          “{done.title}” was uploaded privately and is pending review. It will only appear in public discovery after a
          moderator approves it. You can track its status under Me → My Uploads.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild variant="outline" onClick={() => setDone(null)}>
            <Link to="/upload">Upload another</Link>
          </Button>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link to="/me">View my uploads</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl pt-4">
      <h1 className="text-2xl font-extrabold tracking-tight">Upload a video</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Only upload content you own or are authorised to share. Uploads are stored privately and go through review
        before public release.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="up-title">Title *</Label>
          <Input id="up-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Your video's title" required minLength={2} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="up-desc">Description</Label>
          <Textarea id="up-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={3} placeholder="What is this video about?" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger aria-label="Choose a category"><SelectValue placeholder="Choose…" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.slug} value={c.slug}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger aria-label="Choose content type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="short">Short</SelectItem>
                <SelectItem value="trailer">Trailer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="up-genres">Tags</Label>
            <Input id="up-genres" value={genres} onChange={(e) => setGenres(e.target.value)} placeholder="music, travel…" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="up-lang">Language</Label>
            <Input id="up-lang" value={language} onChange={(e) => setLanguage(e.target.value)} maxLength={40} />
          </div>
          <div className="space-y-2">
            <Label>Age rating</Label>
            <Select value={ageRating} onValueChange={setAgeRating}>
              <SelectTrigger aria-label="Choose age rating"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                {AGE_RATINGS.map((r) => (
                  <SelectItem key={r || "none"} value={r}>{r || "None"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="up-file">Video file *</Label>
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-card/50 p-4">
            <CloudUpload className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <input
                id="up-file"
                type="file"
                accept="video/*"
                onChange={(e) => pickFile(e.target.files?.[0])}
                className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-foreground"
              />
              {file ? (
                <p className="mt-1.5 truncate text-xs text-muted-foreground">
                  {file.name} · {(file.size / 1048576).toFixed(1)} MB{duration ? ` · ${formatDuration(duration)}` : ""}
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-muted-foreground">MP4/WebM up to 200 MB, stored privately.</p>
              )}
            </div>
            {file && (
              <button type="button" onClick={() => { setFile(null); setDuration(null); }} aria-label="Remove video file" className="rounded p-1 text-muted-foreground hover:text-destructive">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="up-thumb">Thumbnail (optional)</Label>
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-card/50 p-4">
            {thumbPreview ? (
              <div className="h-12 w-20 shrink-0 overflow-hidden rounded-lg border border-border/50">
                <Image src={thumbPreview} alt="Thumbnail preview" className="h-full w-full object-cover" />
              </div>
            ) : (
              <CloudUpload className="h-6 w-6 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
            <input
              id="up-thumb"
              type="file"
              accept="image/*"
              onChange={(e) => pickThumb(e.target.files?.[0])}
              className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-foreground"
            />
            {thumbFile && (
              <button type="button" onClick={() => { setThumbFile(null); setThumbPreview(null); }} aria-label="Remove thumbnail" className="rounded p-1 text-muted-foreground hover:text-destructive">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-border bg-card/50 p-4">
          <Switch id="up-downloadable" checked={allowDownload} onCheckedChange={setAllowDownload} className="mt-0.5" />
          <div>
            <Label htmlFor="up-downloadable" className="cursor-pointer">Allow offline downloads</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Viewers can store an authorized copy of your file on their device for offline viewing. Enable this only
              if you have the right to allow downloads of this content.
            </p>
          </div>
        </div>

        <Button type="submit" disabled={!valid || busy} className="w-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90">
          {busy ? "Uploading…" : "Submit for review"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          By submitting, you confirm you hold the rights to this content. It stays private until approved.
        </p>
      </form>
    </div>
  );
}