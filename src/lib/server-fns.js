import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser, requireAdmin } from "@/lib/auth-middleware";
import { CATEGORIES, categoryLabel } from "@/lib/format";
import { searchYouTube, getYouTubeVideo } from "@/lib/providers.server";

const CATEGORY_VALUES = CATEGORIES.map((c) => c.slug);
const PUBLISHED = { status: "published", visibility: "public" };
const CARD_FIELDS = [
  "title", "slug", "category", "thumbnail_url", "banner_url", "duration_seconds",
  "creator_name", "is_demo", "upcoming", "content_type", "featured", "media_url",
  "source_label", "release_year", "language", "age_rating", "created_by_id", "created_date",
];

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) ||
  "video";

async function resolvePlaybackUrl(context, mediaUrl, expiresIn = 3600) {
  if (!mediaUrl) return "";
  if (/^https?:\/\//.test(mediaUrl)) return mediaUrl;
  try {
    const result = await context
      .getBase44()
      .asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: mediaUrl, expires_in: expiresIn });
    return result.signed_url ?? "";
  } catch {
    return "";
  }
}

async function notify(context, { recipient_id, message, type = "system", video_slug = "" }) {
  if (!recipient_id) return;
  try {
    await context.getBase44().entities.Notification.create({ recipient_id, message, type, video_slug });
  } catch {
    /* notification failure must not break the action */
  }
}

// ---------- Public content ----------

export const getHomeData = createServerFn({ method: "GET" }).handler(async ({ context }) => {
  const b44 = context.getBase44();
  const list = async (query, opts = {}) =>
    (await b44.entities.Video.filter(
      { ...PUBLISHED, upcoming: { $ne: true }, ...query },
      { sort: "-created_date", limit: 10, fields: CARD_FIELDS, ...opts },
    )).items;

  const featured = await list({ featured: true }, { limit: 5 });
  const trending = await list({}, { limit: 8 });
  const latest = await list({}, { limit: 12 });
  const upcomingRow = await list({ upcoming: true }, { limit: 10 });

  const rows = [];
  if (trending.length) rows.push({ key: "trending", title: "Trending Now", videos: trending, seeAllTo: "/category/trending" });

  const me = await b44.auth.me().catch(() => null);
  let savedSlugs = [];
  if (me) {
    const [progress, saved] = await Promise.all([
      b44.entities.WatchProgress.filter({ completed: { $ne: true } }, { sort: "-updated_date", limit: 10 }),
      b44.entities.LibraryItem.filter({}, { fields: ["video_slug"], limit: 100 }),
    ]);
    savedSlugs = saved.items.map((i) => i.video_slug);
    const continueWatching = progress.items
      .filter((p) => p.video_slug)
      .map((p) => ({
        id: p.id,
        slug: p.video_slug,
        provider: p.provider ?? "vybex",
        provider_video_id: p.provider_video_id ?? "",
        title: p.video_title,
        thumbnail_url: p.video_thumbnail,
        category: p.video_category,
        duration_seconds: p.duration_seconds ?? null,
        badgeLabel: "Resume",
      }));
    if (continueWatching.length) {
      rows.push({ key: "continue", title: "Continue Watching", videos: continueWatching, seeAllTo: "/me" });
    }
  }

  for (const c of CATEGORIES) {
    const items = await list({ category: c.slug });
    if (!items.length) continue;
    rows.push({
      key: c.slug,
      title: c.slug === "anime" ? "Popular Anime" : c.label === "Short Videos" ? "Short Videos" : c.label,
      videos: items,
      seeAllTo: `/category/${c.slug}`,
      ...(c.slug === "sports"
        ? { caption: "Sample demo fixtures only — connect a licensed sports data source for live events." }
        : {}),
    });
  }
  if (latest.length) rows.push({ key: "latest", title: "Latest Releases", videos: latest, seeAllTo: "/category/trending" });
  if (upcomingRow.length) rows.push({ key: "upcoming", title: "Upcoming", videos: upcomingRow, seeAllTo: "/category/trending" });

  return { featured, rows, savedSlugs };
});

export const getCategoryVideos = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string().min(1).max(40), sort: z.enum(["newest", "title"]).default("newest") }))
  .handler(async ({ data, context }) => {
    const b44 = context.getBase44();
    const isTrending = data.slug === "trending";
    if (!isTrending && !CATEGORY_VALUES.includes(data.slug)) {
      return { slug: data.slug, label: categoryLabel(data.slug), videos: [] };
    }
    const query = { ...PUBLISHED, ...(isTrending ? {} : { category: data.slug }) };
    const page = await b44.entities.Video.filter(query, {
      sort: data.sort === "title" ? "title" : "-created_date",
      limit: 60,
      fields: CARD_FIELDS,
    });
    return { slug: data.slug, label: isTrending ? "Trending" : categoryLabel(data.slug), videos: page.items };
  });

export const searchContent = createServerFn({ method: "GET" })
  .validator(
    z.object({
      q: z.string().max(120).default(""),
      category: z.string().max(20).default("all"),
      sort: z.enum(["relevance", "newest", "title"]).default("newest"),
    }),
  )
  .handler(async ({ data, context }) => {
    const b44 = context.getBase44();
    const q = data.q.trim();
    const categoryFilter =
      data.category !== "all" && CATEGORY_VALUES.includes(data.category) ? { category: data.category } : {};

    if (data.sort === "relevance" && q) {
      // Relevance: exact-field title matches first, then description/creator/genre
      // matches — each group newest-first. No fabricated ranking.
      const esc = escapeRegex(q);
      const fetchPage = ($or) =>
        b44.entities.Video.filter({ ...PUBLISHED, ...categoryFilter, $or }, { sort: "-created_date", limit: 60, fields: CARD_FIELDS });
      const [titlePage, otherPage] = await Promise.all([
        fetchPage([{ title: { $regex: esc, $options: "i" } }]),
        fetchPage([
          { title: { $regex: esc, $options: "i" } },
          { description: { $regex: esc, $options: "i" } },
          { creator_name: { $regex: esc, $options: "i" } },
          { genres: { $regex: esc, $options: "i" } },
          { category: { $regex: esc, $options: "i" } },
        ]),
      ]);
      const titleIds = new Set(titlePage.items.map((v) => v.id));
      return [...titlePage.items, ...otherPage.items.filter((v) => !titleIds.has(v.id))];
    }

    const query = { ...PUBLISHED, ...categoryFilter };
    if (q) {
      const esc = escapeRegex(q);
      query.$or = [
        { title: { $regex: esc, $options: "i" } },
        { description: { $regex: esc, $options: "i" } },
        { creator_name: { $regex: esc, $options: "i" } },
        { genres: { $regex: esc, $options: "i" } },
        { category: { $regex: esc, $options: "i" } },
      ];
    }
    const page = await b44.entities.Video.filter(query, {
      sort: data.sort === "title" ? "title" : "-created_date",
      limit: 60,
      fields: CARD_FIELDS,
    });
    return page.items;
  });

export const getVideoDetail = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string().min(1).max(120) }))
  .handler(async ({ data, context }) => {
    const b44 = context.getBase44();
    const found = (await b44.entities.Video.filter({ slug: data.slug }, { limit: 1 })).items;
    const video = found[0] ?? null;
    if (!video) return null;

    const related = (await b44.entities.Video.filter(
      { ...PUBLISHED, category: video.category, slug: { $ne: video.slug } },
      { sort: "-created_date", limit: 10, fields: CARD_FIELDS },
    )).items;

    const playback_url = await resolvePlaybackUrl(context, video.media_url);

    const me = await b44.auth.me().catch(() => null);
    let inLibrary = false;
    let progress = null;
    if (me) {
      const [lib, prog] = await Promise.all([
        b44.entities.LibraryItem.filter({ video_slug: data.slug }, { limit: 1 }),
        b44.entities.WatchProgress.filter({ video_slug: data.slug }, { limit: 1 }),
      ]);
      inLibrary = lib.items.length > 0;
      progress = prog.items[0] ?? null;
    }
    return { video, related, playback_url, inLibrary, progress };
  });

// ---------- Library ----------

export const toggleLibrary = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ videoId: z.string().min(1).max(60) }))
  .handler(async ({ data, context }) => {
    const b44 = context.getBase44();
    const video = await b44.entities.Video.get(data.videoId).catch(() => null);
    if (!video) throw Object.assign(new Error("Video not found"), { status: 404 });

    const mine = (await b44.entities.LibraryItem.filter({ video_id: video.id }, { limit: 1 })).items;
    if (mine.length) {
      await b44.entities.LibraryItem.delete(mine[0].id);
      return { saved: false };
    }
    await b44.entities.LibraryItem.create({
      video_id: video.id,
      video_slug: video.slug,
      video_title: video.title,
      video_thumbnail: video.thumbnail_url ?? "",
      video_category: video.category,
      video_duration_seconds: video.duration_seconds ?? null,
    });
    return { saved: true };
  });

export const getMyLibrary = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const page = await context.getBase44().entities.LibraryItem.filter({}, { sort: "-created_date", limit: 100 });
    return page.items.map((i) => ({
      id: i.id,
      video_id: i.video_id,
      slug: i.video_slug,
      provider: i.provider ?? "vybex",
      provider_video_id: i.provider_video_id ?? "",
      source_url: i.source_url ?? "",
      creator_name: i.creator_name ?? "",
      title: i.video_title,
      thumbnail_url: i.video_thumbnail,
      category: i.video_category,
      duration_seconds: i.video_duration_seconds ?? null,
    }));
  });

// ---------- Watch progress ----------

export const saveWatchProgress = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      videoId: z.string().min(1).max(60),
      position: z.number().min(0).max(86400),
      duration: z.number().min(0).max(86400).default(0),
      completed: z.boolean().default(false),
    }),
  )
  .handler(async ({ data, context }) => {
    const b44 = context.getBase44();
    const video = await b44.entities.Video.get(data.videoId).catch(() => null);
    if (!video) throw Object.assign(new Error("Video not found"), { status: 404 });

    const payload = {
      video_id: video.id,
      video_slug: video.slug,
      video_title: video.title,
      video_thumbnail: video.thumbnail_url ?? "",
      video_category: video.category,
      position_seconds: Math.floor(data.position),
      duration_seconds: data.duration > 0 ? Math.floor(data.duration) : (video.duration_seconds ?? null),
      completed: data.completed,
    };
    const existing = (await b44.entities.WatchProgress.filter({ video_id: video.id }, { limit: 1 })).items[0];
    if (existing) await b44.entities.WatchProgress.update(existing.id, payload);
    else await b44.entities.WatchProgress.create(payload);
    return { ok: true };
  });

export const getMyDashboard = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const b44 = context.getBase44();
    const [continuePage, historyPage, uploadPage, unread] = await Promise.all([
      b44.entities.WatchProgress.filter({ completed: { $ne: true } }, { sort: "-updated_date", limit: 10 }),
      b44.entities.WatchProgress.filter({}, { sort: "-updated_date", limit: 20 }),
      b44.entities.Video.filter({ status: { $in: ["pending", "rejected", "draft"] } }, { sort: "-created_date", limit: 50, fields: CARD_FIELDS }),
      b44.entities.Notification.count({ read: false }),
    ]);
    const shape = (p) => ({
      id: p.id, video_id: p.video_id, slug: p.video_slug, title: p.video_title,
      provider: p.provider ?? "vybex", provider_video_id: p.provider_video_id ?? "",
      thumbnail_url: p.video_thumbnail, category: p.video_category,
      position_seconds: p.position_seconds ?? 0, duration_seconds: p.duration_seconds ?? null,
      completed: p.completed ?? false,
    });
    return {
      continueWatching: continuePage.items.filter((p) => p.video_slug).map(shape),
      history: historyPage.items.filter((p) => p.video_slug).map(shape),
      uploads: uploadPage.items,
      unread,
    };
  });

// ---------- Uploads & moderation ----------

const UploadInput = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(2000).default(""),
  category: z.enum(CATEGORY_VALUES),
  genres: z.array(z.string().max(30)).max(8).default([]),
  content_type: z.enum(["video", "short", "trailer"]).default("video"),
  // The uploader must explicitly authorize offline downloads of their own file.
  downloadable: z.boolean().default(false),
  // Uploads must live in the app's private storage — a caller cannot point a
  // submission at an arbitrary external URL and bypass the private-upload flow.
  media_uri: z
    .string()
    .min(1)
    .max(500)
    .refine((v) => !/^https?:\/\//i.test(v), { message: "Media must be uploaded through VYBEX private storage" }),
  thumbnail_url: z.string().max(500).default(""),
  language: z.string().max(40).default("English"),
  age_rating: z.string().max(20).default(""),
  duration_seconds: z.number().min(0).max(86400).nullish().default(null),
});

export const submitUpload = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(UploadInput)
  .handler(async ({ data, context }) => {
    const b44 = context.getBase44();
    const me = context.user;
    const slug = `${slugify(data.title)}-${Math.random().toString(36).slice(2, 6)}`;
    const video = await b44.entities.Video.create({
      title: data.title,
      slug,
      description: data.description,
      category: data.category,
      genres: data.genres,
      thumbnail_url: data.thumbnail_url,
      media_url: data.media_uri,
      content_type: data.content_type,
      downloadable: data.downloadable,
      creator_name: me.full_name || me.email,
      visibility: "private",
      status: "pending",
      featured: false,
      upcoming: false,
      language: data.language,
      age_rating: data.age_rating,
      duration_seconds: data.duration_seconds ?? null,
      is_demo: false,
      source_label: "User upload",
    });
    await notify(context, {
      recipient_id: me.id,
      message: `Your upload “${data.title}” was submitted and is awaiting review.`,
      type: "moderation",
      video_slug: slug,
    });
    return { id: video.id, slug: video.slug, status: video.status };
  });

const ModerationInput = z.object({
  videoId: z.string().min(1).max(60),
  action: z.enum(["publish", "unpublish", "reject", "feature", "unfeature", "delete"]),
  reason: z.string().max(500).default(""),
});

export const moderateVideo = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(ModerationInput)
  .handler(async ({ data, context }) => {
    const b44 = context.getBase44();
    const video = await b44.entities.Video.get(data.videoId).catch(() => null);
    if (!video) throw Object.assign(new Error("Video not found"), { status: 404 });

    switch (data.action) {
      case "publish":
        await b44.entities.Video.update(video.id, { status: "published", visibility: "public", moderation_note: "" });
        await notify(context, {
          recipient_id: video.created_by_id,
          message: `Your upload “${video.title}” was approved and is now live on VYBEX.`,
          type: "moderation",
          video_slug: video.slug,
        });
        break;
      case "unpublish":
        await b44.entities.Video.update(video.id, { status: "draft", visibility: "private" });
        break;
      case "reject":
        await b44.entities.Video.update(video.id, { status: "rejected", moderation_note: data.reason || "Did not meet content guidelines." });
        await notify(context, {
          recipient_id: video.created_by_id,
          message: `Your upload “${video.title}” was not approved. ${data.reason || "It did not meet the content guidelines."}`,
          type: "moderation",
          video_slug: video.slug,
        });
        break;
      case "feature":
        await b44.entities.Video.update(video.id, { featured: true });
        break;
      case "unfeature":
        await b44.entities.Video.update(video.id, { featured: false });
        break;
      case "delete":
        await b44.entities.Video.delete(video.id);
        break;
    }
    return { ok: true };
  });

export const adminUpdateVideo = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(
    z.object({
      videoId: z.string().min(1).max(60),
      title: z.string().min(2).max(120).optional(),
      description: z.string().max(2000).optional(),
      category: z.enum(CATEGORY_VALUES).optional(),
      featured: z.boolean().optional(),
      downloadable: z.boolean().optional(),
      upcoming: z.boolean().optional(),
      content_type: z.enum(["video", "short", "trailer"]).optional(),
      thumbnail_url: z.string().max(500).optional(),
      banner_url: z.string().max(500).optional(),
      duration_seconds: z.number().min(0).max(86400).optional(),
      language: z.string().max(40).optional(),
      age_rating: z.string().max(20).optional(),
      release_year: z.number().int().min(1900).max(2100).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { videoId, ...patch } = data;
    const b44 = context.getBase44();
    const video = await b44.entities.Video.get(videoId).catch(() => null);
    if (!video) throw Object.assign(new Error("Video not found"), { status: 404 });
    await b44.entities.Video.update(videoId, patch);
    return { ok: true };
  });

export const getAdminData = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const b44 = context.getBase44();
    const [pending, published, reports] = await Promise.all([
      b44.entities.Video.filter({ status: "pending" }, { sort: "created_date", limit: 50 }),
      b44.entities.Video.filter({ status: "published" }, { sort: "-created_date", limit: 50, fields: CARD_FIELDS }),
      b44.entities.ContentReport.filter({}, { sort: "-created_date", limit: 50 }),
    ]);
    const creatorIds = [...new Set(pending.items.map((v) => v.created_by_id).filter(Boolean))];
    const creatorPage = creatorIds.length
      ? await b44.entities.User.filter({ id: { $in: creatorIds } }).catch(() => null)
      : null;
    // The User entity returns a plain array from filter, not a page object.
    const creators = Array.isArray(creatorPage) ? creatorPage : creatorPage?.items ?? [];
    const creatorName = new Map(creators.map((u) => [u.id, u.full_name || u.email]));
    const pendingWithPlayback = [];
    for (const v of pending.items) {
      pendingWithPlayback.push({
        ...v,
        created_by: creatorName.get(v.created_by_id) ?? "unknown",
        playback_url: await resolvePlaybackUrl(context, v.media_url),
      });
    }
    return { pending: pendingWithPlayback, published: published.items, reports: reports.items };
  });

// ---------- Reports ----------

export const reportContent = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      videoSlug: z.string().min(1).max(120),
      reason: z.enum(["copyright", "inappropriate", "misleading", "broken", "other"]),
      description: z.string().max(2000).default(""),
    }),
  )
  .handler(async ({ data, context }) => {
    const b44 = context.getBase44();
    const found = (await b44.entities.Video.filter({ slug: data.videoSlug }, { limit: 1 })).items;
    const video = found[0];
    if (!video) throw Object.assign(new Error("Video not found"), { status: 404 });
    await b44.entities.ContentReport.create({
      video_id: video.id,
      video_slug: video.slug,
      video_title: video.title,
      reason: data.reason,
      description: data.description,
      status: "open",
    });
    return { ok: true };
  });

export const moderateReport = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(
    z.object({
      reportId: z.string().min(1).max(60),
      status: z.enum(["resolved", "dismissed"]),
      note: z.string().max(500).default(""),
    }),
  )
  .handler(async ({ data, context }) => {
    await context.getBase44().entities.ContentReport.update(data.reportId, {
      status: data.status,
      resolution_note: data.note,
    }).catch(() => {
      throw Object.assign(new Error("Report not found"), { status: 404 });
    });
    return { ok: true };
  });

export const adminCreateVideo = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(
    z.object({
      title: z.string().min(2).max(120),
      description: z.string().max(2000).default(""),
      category: z.enum(CATEGORY_VALUES),
      media_url: z.string().max(500).default(""),
      thumbnail_url: z.string().max(500).default(""),
      banner_url: z.string().max(500).default(""),
      content_type: z.enum(["video", "short", "trailer"]).default("video"),
      creator_name: z.string().max(80).default("VYBEX"),
      featured: z.boolean().default(false),
      upcoming: z.boolean().default(false),
      language: z.string().max(40).default("English"),
      age_rating: z.string().max(20).default(""),
      duration_seconds: z.number().min(0).max(86400).optional(),
      release_year: z.number().int().min(1900).max(2100).optional(),
      source_label: z.string().max(120).default(""),
      genres: z.array(z.string().max(30)).max(8).default([]),
    }),
  )
  .handler(async ({ data, context }) => {
    const b44 = context.getBase44();
    const slug = `${slugify(data.title)}-${Math.random().toString(36).slice(2, 6)}`;
    const video = await b44.entities.Video.create({
      ...data,
      slug,
      visibility: "public",
      status: "published",
      is_demo: false,
    });
    return { id: video.id, slug: video.slug };
  });

// ---------- Downloads (authorized VYBEX content, device-local storage) ----------

export const getDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ videoId: z.string().min(1).max(60) }))
  .handler(async ({ data, context }) => {
    const b44 = context.getBase44();
    const video = await b44.entities.Video.get(data.videoId).catch(() => null);
    if (!video) throw Object.assign(new Error("Video not found"), { status: 404 });
    // Only the owner's explicit authorization makes a file downloadable —
    // publicly viewable is not the same as downloadable.
    const eligible =
      video.status === "published" &&
      video.visibility === "public" &&
      video.downloadable === true &&
      !!video.media_url;
    if (!eligible) {
      throw Object.assign(new Error("The owner has not authorized offline downloads for this video"), { status: 403 });
    }
    // A fresh short-lived signed URL per download — a cached or expired link is never reused.
    const url = await resolvePlaybackUrl(context, video.media_url, 900);
    if (!url) throw Object.assign(new Error("The media file is not available right now"), { status: 404 });
    return {
      url,
      slug: video.slug,
      title: video.title,
      thumbnail: video.thumbnail_url ?? "",
      category: video.category ?? "",
      creator: video.creator_name ?? "",
    };
  });

// ---------- External provider (YouTube) ----------

// Unified discovery search: real VYBEX uploads + live YouTube.
// Provider results are fetched fresh from YouTube on every call and are
// never persisted. The provider reports its own honest status.
export const searchDiscover = createServerFn({ method: "GET" })
  .validator(
    z.object({
      q: z.string().max(120).default(""),
      source: z.enum(["all", "youtube", "uploads"]).default("all"),
      category: z.string().max(20).default("all"),
      sort: z.enum(["relevance", "newest", "title"]).default("relevance"),
      youtubePageToken: z.string().max(100).default(""),
    }),
  )
  .handler(async ({ data, context }) => {
    const b44 = context.getBase44();
    const q = data.q.trim();
    const includeUploads = data.source === "all" || data.source === "uploads";
    const includeYouTube = data.source === "all" || data.source === "youtube";
    const isFirstPage = data.youtubePageToken === "";

    // Providers search by keyword; the category label augments topical queries.
    const categoryTerm =
      data.category !== "all" && CATEGORY_VALUES.includes(data.category) ? categoryLabel(data.category) : "";
    const providerQuery = [q, categoryTerm].filter(Boolean).join(" ");

    const uploadsTask =
      includeUploads && isFirstPage
        ? (async () => {
            const query = { ...PUBLISHED };
            if (data.category !== "all") query.category = data.category;
            if (q) {
              const esc = escapeRegex(q);
              query.$or = [
                { title: { $regex: esc, $options: "i" } },
                { description: { $regex: esc, $options: "i" } },
                { creator_name: { $regex: esc, $options: "i" } },
                { genres: { $regex: esc, $options: "i" } },
              ];
            }
            const page = await b44.entities.Video.filter(query, {
              sort: data.sort === "title" ? "title" : "-created_date",
              limit: 24,
              fields: CARD_FIELDS,
            });
            return { status: "ok", error: "", items: page.items.map((v) => ({ ...v, provider: "vybex" })) };
          })().catch(() => ({ status: "error", error: "other", items: [] }))
        : null;

    const youtubeTask = includeYouTube
      ? searchYouTube({ q: providerQuery, pageToken: data.youtubePageToken })
      : Promise.resolve(null);

    const [uploads, youtube] = await Promise.all([uploadsTask, youtubeTask]);

    // One flat result list, deduplicated by provider + id, so a provider's video
    // can never be confused with another provider's.
    const seen = new Set();
    const items = [];
    for (const item of [
      ...(uploads?.items ?? []),
      ...(youtube?.items ?? []),
    ]) {
      const key = item.provider === "vybex" ? `vybex:${item.id}` : `${item.provider}:${item.provider_video_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(item);
    }

    return {
      items,
      youtube: youtube
        ? { status: youtube.status, error: youtube.error ?? "", nextPageToken: youtube.nextPageToken ?? "" }
        : { status: "idle", error: "", nextPageToken: "" },
    };
  });

export const getExternalVideo = createServerFn({ method: "GET" })
  .validator(z.object({ provider: z.literal("youtube"), videoId: z.string().min(1).max(40) }))
  .handler(async ({ data, context }) => {
    const result = await getYouTubeVideo(data.videoId);
    if (result.status !== "ok") return result;

    const b44 = context.getBase44();
    const me = await b44.auth.me().catch(() => null);
    let inLibrary = false;
    let progress = null;
    if (me) {
      const [lib, prog] = await Promise.all([
        b44.entities.LibraryItem.filter(
          { provider: data.provider, provider_video_id: data.videoId },
          { limit: 1 },
        ),
        b44.entities.WatchProgress.filter(
          { provider: data.provider, provider_video_id: data.videoId },
          { limit: 1 },
        ),
      ]);
      inLibrary = lib.items.length > 0;
      progress = prog.items[0] ?? null;
    }
    return { status: "ok", video: result.video, inLibrary, progress };
  });

export const toggleExternalLibrary = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      provider: z.literal("youtube"),
      providerVideoId: z.string().min(1).max(40),
      title: z.string().min(1).max(200),
      thumbnail: z.string().max(500).default(""),
      creator: z.string().max(120).default(""),
      category: z.string().max(20).default(""),
      duration: z.number().min(0).max(86400).nullish().default(null),
      sourceUrl: z.string().max(300).default(""),
    }),
  )
  .handler(async ({ data, context }) => {
    const b44 = context.getBase44();
    const mine = (
      await b44.entities.LibraryItem.filter(
        { provider: data.provider, provider_video_id: data.providerVideoId },
        { limit: 1 },
      )
    ).items;
    if (mine.length) {
      await b44.entities.LibraryItem.delete(mine[0].id);
      return { saved: false };
    }
    await b44.entities.LibraryItem.create({
      video_id: `${data.provider}:${data.providerVideoId}`,
      video_slug: `${data.provider}-${data.providerVideoId}`,
      video_title: data.title,
      video_thumbnail: data.thumbnail,
      video_category: data.category,
      video_duration_seconds: data.duration ?? null,
      provider: data.provider,
      provider_video_id: data.providerVideoId,
      creator_name: data.creator,
      source_url: data.sourceUrl,
    });
    return { saved: true };
  });

export const removeLibraryEntry = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ itemId: z.string().min(1).max(60) }))
  .handler(async ({ data, context }) => {
    const b44 = context.getBase44();
    const found = await b44.entities.LibraryItem.get(data.itemId).catch(() => null);
    if (!found) throw Object.assign(new Error("This item is no longer in your library"), { status: 404 });
    await b44.entities.LibraryItem.delete(data.itemId);
    return { saved: false };
  });

export const saveExternalProgress = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      provider: z.literal("youtube"),
      providerVideoId: z.string().min(1).max(40),
      position: z.number().min(0).max(86400),
      duration: z.number().min(0).max(86400).default(0),
      completed: z.boolean().default(false),
      title: z.string().max(200).default(""),
      thumbnail: z.string().max(500).default(""),
      category: z.string().max(20).default(""),
    }),
  )
  .handler(async ({ data, context }) => {
    const b44 = context.getBase44();
    const payload = {
      video_id: `${data.provider}:${data.providerVideoId}`,
      video_slug: `${data.provider}-${data.providerVideoId}`,
      video_title: data.title,
      video_thumbnail: data.thumbnail,
      video_category: data.category,
      provider: data.provider,
      provider_video_id: data.providerVideoId,
      position_seconds: Math.floor(data.position),
      duration_seconds: data.duration > 0 ? Math.floor(data.duration) : null,
      completed: data.completed,
    };
    const existing = (
      await b44.entities.WatchProgress.filter(
        { provider: data.provider, provider_video_id: data.providerVideoId },
        { limit: 1 },
      )
    ).items[0];
    if (existing) await b44.entities.WatchProgress.update(existing.id, payload);
    else await b44.entities.WatchProgress.create(payload);
    return { ok: true };
  });