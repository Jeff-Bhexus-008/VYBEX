export function formatDuration(seconds) {
  if (!seconds || seconds <= 0 || Number.isNaN(seconds)) return "";
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export const CATEGORIES = [
  { slug: "anime", label: "Anime" },
  { slug: "animation", label: "Animation" },
  { slug: "short", label: "Short Videos" },
  { slug: "comedy", label: "Comedy" },
  { slug: "music", label: "Music" },
  { slug: "sports", label: "Sports" },
  { slug: "movies", label: "Movies & Trailers" },
  { slug: "educational", label: "Educational" },
  { slug: "kids", label: "Kids" },
];

export function categoryLabel(slug) {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}

export function formatBytes(bytes) {
  if (!bytes || bytes <= 0 || Number.isNaN(bytes)) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = unit === 0 || value >= 100 ? Math.round(value) : Number(value.toFixed(1));
  return `${rounded} ${units[unit]}`;
}