import { getDownloadUrl } from "@/lib/server-fns";
import { saveCompletedDownload, getDownloadMeta } from "@/lib/downloads-store";

// In-memory registry of this tab's active downloads. Only a completed file
// ever reaches IndexedDB — an interrupted or canceled download leaves no
// partial record behind, so nothing is ever marked "downloaded" that isn't.
const active = new Map();
const listeners = new Set();

const emit = () => {
  const snapshot = [...active.values()];
  listeners.forEach((fn) => fn(snapshot));
};

export function subscribeActive(fn) {
  listeners.add(fn);
  fn([...active.values()]);
  return () => listeners.delete(fn);
}

function normalize(info) {
  return {
    videoId: info.id ?? info.videoId,
    slug: info.slug ?? "",
    title: info.title ?? "",
    thumbnail: info.thumbnail_url ?? info.thumbnail ?? "",
    category: info.category ?? "",
    creator: info.creator_name ?? info.creator ?? "",
  };
}

export async function startDownload(rawInfo) {
  const info = normalize(rawInfo);
  const { videoId } = info;
  if (!videoId || active.has(videoId)) return;
  // Never store a duplicate of a file already on this device.
  if (await getDownloadMeta(videoId).catch(() => null)) return;

  const entry = { ...info, status: "preparing", received: 0, total: 0, error: "", controller: new AbortController() };
  let stalled = false; // set by the watchdog on a stalled transfer; read by the catch below
  active.set(videoId, entry);
  emit();
  try {
    // A fresh, short-lived signed URL is fetched per download, so an expired
    // link can never be reused.
    const target = await getDownloadUrl({ data: { videoId } });
    if (entry.status === "canceled") {
      active.delete(videoId);
      emit();
      return;
    }
    entry.status = "downloading";
    emit();

    const res = await fetch(target.url, { signal: entry.controller.signal });
    if (!res.ok) throw new Error(`The media server returned an error (${res.status}).`);
    entry.total = Number(res.headers.get("content-length") || 0);
    emit();

    // Stream the file in chunks so progress is genuine; the blob is assembled
    // only when the transfer is complete.
    const contentType = res.headers.get("content-type") || "video/mp4";
    const reader = res.body.getReader();
    const chunks = [];
    let received = 0;
    let lastEmit = 0;
    for (;;) {
      // A watchdog aborts transfers that stop delivering data, so a stalled
      // connection surfaces as a retryable failure instead of hanging forever.
      const readPromise = reader.read();
      const watchdog = setTimeout(() => {
        stalled = true;
        entry.error = "The download stalled — no data arrived for a while. Check your connection and try again.";
        entry.controller.abort();
      }, 45000);
      let result;
      try {
        result = await readPromise;
      } finally {
        clearTimeout(watchdog);
      }
      if (result.done) break;
      chunks.push(result.value);
      received += result.value.byteLength;
      entry.received = received;
      const now = Date.now();
      if (now - lastEmit > 250) {
        lastEmit = now;
        emit();
      }
    }
    entry.received = received;
    entry.total = entry.total || received;
    emit();
    // A transfer that ended before all announced bytes arrived is incomplete —
    // a truncated file is never stored as a completed download.
    if (entry.total && received < entry.total) {
      throw new Error("The download ended early — the file was incomplete. Try again.");
    }
    if (received === 0) throw new Error("The file could not be downloaded — it was empty.");

    const blob = new Blob(chunks, { type: contentType });
    // Persisted first; only then is the download reported as complete.
    await saveCompletedDownload({ ...info, sizeBytes: blob.size, contentType }, blob);
    entry.status = "completed";
    entry.sizeBytes = blob.size;
    emit();
    setTimeout(() => {
      const current = active.get(videoId);
      if (current === entry && current.status === "completed") {
        active.delete(videoId);
        emit();
      }
    }, 4000);
  } catch (err) {
    if (!stalled && (err?.name === "AbortError" || entry.status === "canceled")) {
      active.delete(videoId); // nothing was persisted — nothing to clean up
      emit();
      return;
    }
    entry.status = "failed";
    entry.error = stalled
      ? entry.error
      : err?.name === "QuotaExceededError"
        ? "Your browser's storage is full or restricted. Free up space or try another browser."
        : err?.message || "The download could not be completed.";
    emit();
  }
}

export function cancelDownload(videoId) {
  const entry = active.get(videoId);
  if (!entry) return;
  entry.status = "canceled";
  entry.controller.abort();
}

export function retryDownload(entry) {
  active.delete(entry.videoId);
  emit();
  return startDownload(entry);
}

export function dismissDownload(videoId) {
  if (active.delete(videoId)) emit();
}