import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { moderateVideo } from "@/lib/server-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { categoryLabel } from "@/lib/format";

export default function AdminPending({ items, invalidate }) {
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");

  const act = useMutation({
    mutationFn: ({ videoId, action, reason: r }) => moderateVideo({ data: { videoId, action, reason: r } }),
    onSuccess: (_d, vars) => {
      toast.success(vars.action === "publish" ? "Submission published" : vars.action === "reject" ? "Submission rejected" : "Updated");
      setRejecting(null);
      setReason("");
      invalidate();
    },
    onError: (err) => toast.error(err.message || "Action failed"),
  });

  if (!items?.length) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card/40 px-4 py-10 text-center text-sm text-muted-foreground">
        No uploads awaiting review.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((v) => (
        <li key={v.id} className="rounded-xl border border-border/60 bg-card/60 p-4">
          <div className="grid gap-4 md:grid-cols-[280px_1fr]">
            <div className="overflow-hidden rounded-lg border border-border/50 bg-black">
              {v.playback_url ? (
                <video controls preload="metadata" src={v.playback_url} poster={v.thumbnail_url} className="aspect-video w-full" />
              ) : (
                <div className="flex aspect-video items-center justify-center text-xs text-muted-foreground">No playable media</div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold">{v.title}</h3>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">{categoryLabel(v.category)}</span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">by {v.created_by || "unknown"}</span>
              </div>
              {v.description ? <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{v.description}</p> : null}
              <p className="mt-1.5 text-xs text-muted-foreground/70">Type: {v.content_type} · Language: {v.language || "—"} · Age: {v.age_rating || "—"}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => act.mutate({ videoId: v.id, action: "publish" })}
                  disabled={act.isPending}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Check className="h-4 w-4" aria-hidden="true" /> Publish
                </Button>
                <Dialog open={rejecting === v.id} onOpenChange={(o) => { setRejecting(o ? v.id : null); setReason(""); }}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10">
                      <X className="h-4 w-4" aria-hidden="true" /> Reject
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reject “{v.title}”?</DialogTitle>
                    </DialogHeader>
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Reason shown to the uploader (optional)"
                      rows={3}
                      maxLength={500}
                    />
                    <DialogFooter>
                      <Button variant="outline" size="sm" onClick={() => setRejecting(null)}>Cancel</Button>
                      <Button
                        size="sm"
                        onClick={() => act.mutate({ videoId: v.id, action: "reject", reason })}
                        disabled={act.isPending}
                        className="bg-destructive text-primary-foreground hover:bg-destructive/90"
                      >
                        Reject submission
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}