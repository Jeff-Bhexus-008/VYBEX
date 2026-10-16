import { useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";

/**
 * Add/remove from the signed-in user's library. The page owns the saved state
 * (`saved`) and receives the toggle result through `onResult`.
 */
export default function LibraryButton({ saved = false, busy = false, onToggle, size = "default", variant = "secondary", showLabel = true }) {
  const { user, navigateToLogin } = useAuth();

  const handle = (e) => {
    e.preventDefault?.();
    e.stopPropagation?.();
    if (!user) return navigateToLogin();
    onToggle?.();
  };

  const label = saved ? "Remove from Library" : "Add to Library";
  return (
    <Button type="button" variant={variant} size={size} onClick={handle} aria-label={label} aria-pressed={saved} disabled={busy}>
      {saved ? <BookmarkCheck className="h-4 w-4 text-primary" aria-hidden="true" /> : <Bookmark className="h-4 w-4" aria-hidden="true" />}
      {showLabel && <span>{label}</span>}
    </Button>
  );
}