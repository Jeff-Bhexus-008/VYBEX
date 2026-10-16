// Reels category chips: each maps to a real YouTube search query used by the
// server. No database structure is added — the feed is discovered content.
export const REELS_CATEGORIES = [
  { slug: "foryou", label: "For You", query: "viral trending shorts" },
  { slug: "comedy", label: "Comedy", query: "funny comedy shorts" },
  { slug: "anime", label: "Anime", query: "anime shorts edits" },
  { slug: "sports", label: "Sports", query: "football highlights shorts" },
  { slug: "music", label: "Music", query: "music shorts" },
  { slug: "gaming", label: "Gaming", query: "gaming shorts clips" },
  { slug: "education", label: "Education", query: "educational facts shorts" },
  { slug: "motivation", label: "Motivation", query: "motivational shorts" },
  { slug: "movies", label: "Movies & Trailers", query: "movie trailer preview" },
];

export function reelsQuery(slug) {
  return REELS_CATEGORIES.find((c) => c.slug === slug) ?? null;
}

export function reelsLabel(slug) {
  return reelsQuery(slug)?.label ?? "Reels";
}