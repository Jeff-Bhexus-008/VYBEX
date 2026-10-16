import { useCallback, useEffect, useMemo, useState } from "react";
import { listDownloadMetas, deleteDownload, clearAllDownloads } from "@/lib/downloads-store";
import { subscribeActive } from "@/lib/downloads-client";

/**
 * Everything downloaded on this device: completed files from IndexedDB plus
 * the live in-progress downloads from the download manager.
 */
export default function useDownloads() {
  const [metas, setMetas] = useState(null);
  const [activeList, setActiveList] = useState([]);
  const [storageError, setStorageError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const next = await listDownloadMetas();
      setMetas(next);
      setStorageError("");
    } catch (err) {
      setMetas([]);
      setStorageError(err?.message || "local storage unavailable");
    }
  }, []);

  useEffect(() => {
    refresh();
    return subscribeActive((list) => {
      setActiveList(list);
      refresh(); // a completed or canceled download changes what is stored
    });
  }, [refresh]);

  const actions = useMemo(
    () => ({
      remove: async (videoId) => {
        await deleteDownload(videoId);
        await refresh();
      },
      clearAll: async () => {
        await clearAllDownloads();
        await refresh();
      },
      refresh,
    }),
    [refresh],
  );

  return { metas, activeList, storageError, ...actions };
}