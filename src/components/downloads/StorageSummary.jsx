import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatBytes } from "@/lib/format";

/** Storage overview: completed count, space used, and clear-all with confirmation. */
export default function StorageSummary({ count, totalBytes, estimate, onClearAll }) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border border-border/60 bg-card/50 p-4">
      <div>
        <p className="text-xs text-muted-foreground">Completed downloads</p>
        <p className="text-lg font-bold text-foreground">{count}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Downloads storage used</p>
        <p className="text-lg font-bold text-foreground">{formatBytes(totalBytes) || "0 B"}</p>
      </div>
      {estimate && estimate.quota > 0 ? (
        <div>
          <p className="text-xs text-muted-foreground">Browser storage (approx.)</p>
          <p className="text-lg font-bold text-foreground">
            {formatBytes(estimate.usage) || "0 B"} of {formatBytes(estimate.quota)}
          </p>
        </div>
      ) : null}
      {count > 0 ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto text-destructive hover:bg-destructive/10">
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Clear all downloads
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove all downloads from this device?</AlertDialogTitle>
              <AlertDialogDescription>
                This deletes every downloaded file stored on this device. Your online Library and the original
                videos are not affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep them</AlertDialogCancel>
              <AlertDialogAction
                onClick={onClearAll}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove all
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}