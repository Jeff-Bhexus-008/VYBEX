import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Flag, X } from "lucide-react";
import { moderateReport } from "@/lib/server-fns";
import { Button } from "@/components/ui/button";

const REASON_LABELS = {
  copyright: "Copyright / takedown",
  inappropriate: "Inappropriate content",
  misleading: "Misleading",
  broken: "Broken / unplayable",
  other: "Other",
};

export default function AdminReports({ items, invalidate }) {
  const act = useMutation({
    mutationFn: ({ reportId, status }) => moderateReport({ data: { reportId, status } }),
    onSuccess: () => {
      toast.success("Report handled");
      invalidate();
    },
    onError: (err) => toast.error(err.message || "Action failed"),
  });

  if (!items?.length) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card/40 px-4 py-10 text-center text-sm text-muted-foreground">
        No content reports. When users report a title it appears here.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((r) => (
        <li key={r.id} className="rounded-xl border border-border/60 bg-card/60 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Flag className="h-4 w-4 text-destructive" aria-hidden="true" />
            <p className="text-sm font-bold">{r.video_title || r.video_slug}</p>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
              {REASON_LABELS[r.reason] ?? r.reason}
            </span>
            <span
              className={`ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                r.status === "open" ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
              }`}
            >
              {r.status}
            </span>
          </div>
          {r.description ? <p className="mt-2 text-xs text-muted-foreground">{r.description}</p> : null}
          <p className="mt-1.5 text-xs text-muted-foreground/70">Reported by {r.created_by || "unknown"}</p>
          {r.status === "open" ? (
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => act.mutate({ reportId: r.id, status: "resolved" })} disabled={act.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Check className="h-4 w-4" aria-hidden="true" /> Resolve
              </Button>
              <Button size="sm" variant="outline" onClick={() => act.mutate({ reportId: r.id, status: "dismissed" })} disabled={act.isPending} className="border-border">
                <X className="h-4 w-4" aria-hidden="true" /> Dismiss
              </Button>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}