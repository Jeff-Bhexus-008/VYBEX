import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { searchYouTubeReels } from "@/lib/providers.server";
import { reelsQuery } from "@/lib/reels";

// Reels feed page: real short-form videos discovered live from YouTube.
// Nothing is persisted and no results are fabricated — the provider's own
// status (ok / blocked / error) is passed straight through to the UI.
export const getReels = createServerFn({ method: "GET" })
  .validator(z.object({ category: z.string().min(1).max(30), pageToken: z.string().max(100).default("") }))
  .handler(async ({ data, context }) => {
    const category = reelsQuery(data.category);
    if (!category) {
      return { status: "error", error: "other", items: [], nextPageToken: "" };
    }
    const result = await searchYouTubeReels({ q: category.query, pageToken: data.pageToken });
    if (result.status !== "ok") {
      return { status: result.status, error: result.error ?? "", items: [], nextPageToken: "" };
    }

    // Mark the signed-in user's already-saved videos (RLS limits this to their
    // own library items — nothing of other users is ever read).
    const b44 = context.getBase44();
    const me = await b44.auth.me().catch(() => null);
    let savedIds = new Set();
    if (me) {
      try {
        const lib = await b44.entities.LibraryItem.filter(
          { provider: "youtube" },
          { fields: ["provider_video_id"], limit: 200 },
        );
        savedIds = new Set((lib.items ?? []).map((i) => i.provider_video_id));
      } catch {
        /* saved markers are optional decoration */
      }
    }
    const items = result.items.map((v) => ({ ...v, saved: savedIds.has(v.provider_video_id) }));
    return { status: "ok", error: "", items, nextPageToken: result.nextPageToken };
  });