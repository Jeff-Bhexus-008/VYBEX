// Device-local storage for genuine offline downloads (browser IndexedDB).
// Files and metadata live on this device only — never in the app's database —
// so "downloaded" can only ever mean "the file exists on this device".
const DB_NAME = "vybex-downloads";
const DB_VERSION = 1;
const META_STORE = "meta";
const FILE_STORE = "files";

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE, { keyPath: "videoId" });
      if (!db.objectStoreNames.contains(FILE_STORE)) db.createObjectStore(FILE_STORE, { keyPath: "videoId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error ?? new Error("IndexedDB is unavailable"));
    };
  });
  return dbPromise;
}

function asPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStores(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([META_STORE, FILE_STORE], mode);
    fn(tx.objectStore(META_STORE), tx.objectStore(FILE_STORE));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Storage operation failed"));
    tx.onabort = () => reject(tx.error ?? new Error("Storage operation was aborted"));
  });
}

export async function listDownloadMetas() {
  const db = await openDb();
  const store = db.transaction(META_STORE, "readonly").objectStore(META_STORE);
  const all = await asPromise(store.getAll());
  return all.sort((a, b) => (b.downloadedAt ?? "").localeCompare(a.downloadedAt ?? ""));
}

export async function getDownloadMeta(videoId) {
  const db = await openDb();
  const store = db.transaction(META_STORE, "readonly").objectStore(META_STORE);
  return asPromise(store.get(videoId));
}

export async function getDownloadBlobUrl(videoId) {
  const db = await openDb();
  const store = db.transaction(FILE_STORE, "readonly").objectStore(FILE_STORE);
  const record = await asPromise(store.get(videoId));
  if (!record?.blob) return null;
  return URL.createObjectURL(record.blob);
}

export async function saveCompletedDownload(meta, blob) {
  await withStores("readwrite", (metaStore, fileStore) => {
    metaStore.put({ ...meta, sizeBytes: blob.size, downloadedAt: new Date().toISOString() });
    fileStore.put({ videoId: meta.videoId, blob });
  });
}

export async function deleteDownload(videoId) {
  await withStores("readwrite", (metaStore, fileStore) => {
    metaStore.delete(videoId);
    fileStore.delete(videoId);
  });
}

export async function clearAllDownloads() {
  await withStores("readwrite", (metaStore, fileStore) => {
    metaStore.clear();
    fileStore.clear();
  });
}

export async function estimateStorage() {
  try {
    const estimate = await navigator.storage?.estimate?.();
    return estimate ? { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 } : null;
  } catch {
    return null;
  }
}