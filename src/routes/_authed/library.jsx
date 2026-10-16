import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Bookmark, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getMyLibrary, removeLibraryEntry } from "@/lib/server-fns";
import VideoGrid from "@/components/VideoGrid";
import EmptyState from "@/components/EmptyState";

export const Route = createFileRoute("/_authed/library")({
  loader: () => getMyLibrary(),
  head: () => ({ meta: [{ title: "My Library — VYBEX" }] }),
  component: LibraryPage,
});

function LibraryPage() {
  const items = Route.useLoaderData();
  const router = useRouter();

  const remove = useMutation({
    mutationFn: (itemId) => removeLibraryEntry({ data: { itemId } }),
    onSuccess: (result) => {
      toast.success(result.saved ? "Added to your Library" : "Removed from your Library");
      router.invalidate();
    },
    onError: (err) => toast.error(err.message || "Could not update your library"),
  });

  return (
    <div className="pt-4">
      <h1 className="text-2xl font-extrabold tracking-tight">My Library</h1>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {items?.length ?? 0} saved {items?.length === 1 ? "title" : "titles"}
      </p>
      <div className="mt-6">
        <VideoGrid
          videos={items ?? []}
          renderAction={(item) => (
            <button
              type="button"
              aria-label={`Remove ${item.title} from library`}
              title="Remove from library"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                remove.mutate(item.id);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-muted-foreground transition-colors hover:bg-destructive hover:text-primary-foreground"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
          emptyState={
            <EmptyState
              icon={Bookmark}
              title="Your library is empty"
              description="Save titles you want to come back to. Tap the bookmark on any video to add it here."
              action={
                <Link to="/" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                  Discover something to watch
                </Link>
              }
            />
          }
        />
      </div>
    </div>
  );
}