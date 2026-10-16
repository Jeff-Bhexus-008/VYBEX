import { secrets } from "base44:runtime";

// Server-only integration helper for the external video provider (YouTube Data API v3).
// API keys stay in server-side secrets — they are never sent to the browser.
// Every function returns an honest status: "ok" | "blocked" (key missing) |
// "error" (with an error code) | "notfound". No fabricated results are ever returned.

const YOUTUBE_BASE = "https://www.googleapis.com/youtube/v3";
const FETCH_TIMEOUT_MS = 10000;
const SEARCH_PAGE_SIZE = 12;

const getSecret = (name) => {
  try {
    return secrets.get(name) || null;
  } catch {
    return null;
  }
};

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function parseIsoDuration(iso) {
  if (!iso) return null;
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return null;
  return (Number(m[1]) || 0) * 3600 + (Number(m[2]) || 0) * 60 + (Number(m[3]) || 0);
}

// ---------- YouTube Data API v3 ----------

async function youtubeRequest(path) {
  const key = getSecret("YOUTUBE_API_KEY");
  if (!key) return { status: "blocked", error: "" };
  try {
    const res = await fetchWithTimeout(`${YOUTUBE_BASE}/${path}${path.includes("?") ? "&" : "?"}key=${key}`);
    if (res.ok) return { status: "ok", data: await res.json() };
    // 403 covers accessDenied/daily-quota; 400 covers keyInvalid.
    return { status: "error", error: res.status === 403 ? "quota" : res.status === 400 ? "credentials" : "other" };
  } catch {
    return { status: "error", error: "network" };
  }
}

function shapeYouTubeVideo(id, snippet, detail) {
  return {
    id: `youtube:${id}`,
    provider: "youtube",
    provider_video_id: id,
    title: snippet?.title ?? "",
    description: (snippet?.description ?? "").slice(0, 500),
    thumbnail_url:
      snippet?.thumbnails?.high?.url ??
      snippet?.thumbnails?.medium?.url ??
      snippet?.thumbnails?.default?.url ??
      "",
    creator_name: snippet?.channelTitle ?? "",
    published_at: snippet?.publishedAt ?? "",
    duration_seconds: detail?.contentDetails ? parseIsoDuration(detail.contentDetails.duration) : null,
    // null = embedding status unknown; false = owner forbids embedding.
    embeddable: detail
      ? detail.status?.embeddable === true && detail.status?.privacyStatus === "public"
      : null,
    source_url: `https://www.youtube.com/watch?v=${id}`,
    is_demo: false,
    upcoming: false,
    category: "",
  };
}

export async function searchYouTube({ q, pageToken = "" }) {
  if (!q || !q.trim()) return { status: "idle", error: "", items: [], nextPageToken: "" };
  const search = await youtubeRequest(
    `search?part=snippet&type=video&maxResults=${SEARCH_PAGE_SIZE}&q=${encodeURIComponent(q.trim())}` +
      (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""),
  );
  if (search.status !== "ok") return { status: search.status, error: search.error, items: [], nextPageToken: "" };

  const raw = search.data.items ?? [];
  const ids = raw.map((i) => i.id?.videoId).filter(Boolean);
  if (!ids.length) return { status: "ok", error: "", items: [], nextPageToken: "" };

  // One extra quota unit: durations + embeddable status for this page.
  const details = await youtubeRequest(`videos?part=status,contentDetails&id=${ids.join(",")}`);
  const byId = new Map(details.status === "ok" ? (details.data.items ?? []).map((v) => [v.id, v]) : []);
  const items = raw.map((i) => i.id?.videoId && shapeYouTubeVideo(i.id.videoId, i.snippet, byId.get(i.id.videoId))).filter(Boolean);
  return { status: "ok", error: "", items, nextPageToken: search.data.nextPageToken ?? "" };
}

export async function getYouTubeVideo(videoId) {
  const res = await youtubeRequest(
    `videos?part=snippet,status,contentDetails&id=${encodeURIComponent(videoId)}`,
  );
  if (res.status !== "ok") return { status: res.status, error: res.error };
  const item = (res.data.items ?? [])[0];
  if (!item || item.status?.privacyStatus !== "public") return { status: "notfound", error: "" };
  const video = shapeYouTubeVideo(item.id, item.snippet, item);
  video.description = (item.snippet?.description ?? "").slice(0, 1000);
  video.thumbnail_url =
    item.snippet?.thumbnails?.maxres?.url ?? item.snippet?.thumbnails?.high?.url ?? video.thumbnail_url;
  video.embeddable = item.status?.embeddable === true;
  video.playback = { type: "youtube", videoId: item.id };
  return { status: "ok", error: "", video };
}

// ---------- Reels (short-form discovery) ----------

// Long videos are never mislabeled as short-form: anything past this length
// is dropped from the Reels feed instead of shown as a Reel.
const REELS_MAX_SECONDS = 600;

export async function searchYouTubeReels({ q, pageToken = "" }) {
  if (!q || !q.trim()) return { status: "idle", error: "", items: [], nextPageToken: "" };
  const search = await youtubeRequest(
    `search?part=snippet&type=video&videoDuration=short&maxResults=${SEARCH_PAGE_SIZE}&q=${encodeURIComponent(q.trim())}` +
      (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""),
  );
  if (search.status !== "ok") return { status: search.status, error: search.error, items: [], nextPageToken: "" };

  const raw = search.data.items ?? [];
  const ids = raw.map((i) => i.id?.videoId).filter(Boolean);
  if (!ids.length) return { status: "ok", error: "", items: [], nextPageToken: "" };

  // One extra quota unit: durations + embed status. Another: channel avatars
  // (legitimate API metadata), so the feed can show creator thumbnails.
  const details = await youtubeRequest(`videos?part=status,contentDetails&id=${ids.join(",")}`);
  const byId = new Map(details.status === "ok" ? (details.data.items ?? []).map((v) => [v.id, v]) : []);
  const channelIds = [...new Set(raw.map((i) => i.snippet?.channelId).filter(Boolean))];
  let avatarByChannel = new Map();
  if (channelIds.length) {
    const channels = await youtubeRequest(`channels?part=snippet&id=${channelIds.join(",")}`);
    if (channels.status === "ok") {
      avatarByChannel = new Map(
        (channels.data.items ?? []).map((c) => [c.id, c.snippet?.thumbnails?.default?.url ?? ""]),
      );
    }
  }

  const items = raw
    .map((i) => {
      if (!i.id?.videoId) return null;
      const shaped = shapeYouTubeVideo(i.id.videoId, i.snippet, byId.get(i.id.videoId));
      shaped.channel_avatar_url = avatarByChannel.get(i.snippet?.channelId) ?? "";
      return shaped;
    })
    .filter(Boolean)
    // Videos the owner forbids embedding stay in the feed — the UI shows an
    // honest fallback with a "Watch on YouTube" link instead of hiding them.
    .filter((v) => v.duration_seconds === null || v.duration_seconds <= REELS_MAX_SECONDS);
  return { status: "ok", error: "", items, nextPageToken: search.data.nextPageToken ?? "" };
}