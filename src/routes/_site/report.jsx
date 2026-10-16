import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Flag } from "lucide-react";
import { toast } from "sonner";
import { reportContent } from "@/lib/server-fns";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_site/report")({
  validateSearch: (s) => ({ video: typeof s.video === "string" ? s.video.slice(0, 120) : undefined }),
  head: () => ({ meta: [{ title: "Report Content — VYBEX" }] }),
  component: ReportPage,
});

const REASONS = [
  { value: "copyright", label: "Copyright infringement / takedown" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "misleading", label: "Misleading information" },
  { value: "broken", label: "Broken or unplayable" },
  { value: "other", label: "Something else" },
];

function ReportPage() {
  const search = Route.useSearch();
  const { user, isLoadingAuth, navigateToLogin } = useAuth();
  const [videoSlug, setVideoSlug] = useState(search.video ?? "");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [done, setDone] = useState(false);

  const submit = useMutation({
    mutationFn: () => reportContent({ data: { videoSlug: videoSlug.trim(), reason, description: description.trim() } }),
    onSuccess: () => {
      setDone(true);
      toast.success("Report received");
    },
    onError: (err) => toast.error(err.message || "Could not submit the report"),
  });

  if (done) {
    return (
      <div className="mx-auto max-w-md pt-16 text-center animate-fade-in">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
          <CheckCircle2 className="h-8 w-8 text-primary" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Report received</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Thank you. Our moderation team will review this title, including copyright takedown requests. Outcomes are
          tracked in the admin review area, and uploaders are notified when action is taken.
        </p>
        <Button asChild variant="outline" className="mt-6 border-border">
          <Link to="/">Back to Home</Link>
        </Button>
      </div>
    );
  }

  if (isLoadingAuth) {
    return <div className="mx-auto mt-24 h-24 w-full max-w-md animate-pulse rounded-xl bg-card/50" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md pt-16 text-center animate-fade-in">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
          <Flag className="h-8 w-8 text-primary" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Sign in to report content</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Reports are tied to verified accounts so our review team can follow up. Signing in takes a moment.
        </p>
        <Button onClick={() => navigateToLogin()} className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90">
          Sign in
        </Button>
      </div>
    );
  }

  const valid = videoSlug.trim().length > 0 && reason !== "";

  return (
    <div className="mx-auto max-w-lg pt-6">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
        <Flag className="h-6 w-6 text-destructive" aria-hidden="true" /> Report Content
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tell us what's wrong with a title. Copyright owners: this form is the takedown channel — every report reaches
        the moderation queue directly.
      </p>
      <form
        onSubmit={(e) => { e.preventDefault(); if (valid && !submit.isPending) submit.mutate(); }}
        className="mt-6 space-y-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="rp-video">Video URL slug *</Label>
          <Input
            id="rp-video"
            value={videoSlug}
            onChange={(e) => setVideoSlug(e.target.value)}
            placeholder="e.g. tears-of-steel (from the title's page address)"
            required
          />
          {search.video && <p className="text-xs text-muted-foreground/70">Prefilled from “{search.video}”.</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Reason *</Label>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger aria-label="Choose a reason"><SelectValue placeholder="Choose…" /></SelectTrigger>
            <SelectContent>
              {REASONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rp-desc">Details</Label>
          <Textarea
            id="rp-desc"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            placeholder="Add context that helps us act — claim details, timestamps, links…"
          />
        </div>
        <Button type="submit" disabled={!valid || submit.isPending} className="w-full bg-destructive font-semibold text-primary-foreground hover:bg-destructive/90">
          {submit.isPending ? "Submitting…" : "Submit report"}
        </Button>
      </form>
    </div>
  );
}