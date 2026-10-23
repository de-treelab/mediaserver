import { useCallback, useSyncExternalStore } from "react";

type DownloadState = {
  objectUrl: string | undefined;
  blob: Blob | undefined;
  isLoading: boolean;
  error: unknown | undefined;
};

type Download = {
  state: DownloadState;
  // Components currently showing the file
  users: number;
  listeners: Set<() => void>;
  controller: AbortController;
};

// Downloaded files nobody shows anymore are kept up to this size, so that
// scrolling back or reopening a document doesn't download it again
const UNUSED_BUDGET_BYTES = 64 * 1024 * 1024;

const LOADING: DownloadState = {
  objectUrl: undefined,
  blob: undefined,
  isLoading: true,
  error: undefined,
};
const SKIPPED: DownloadState = { ...LOADING, isLoading: false };

// By url. Unused downloads are moved to the end when released, so iterating
// visits the least recently used ones first.
const downloads = new Map<string, Download>();

const update = (download: Download, state: Partial<DownloadState>) => {
  download.state = { ...download.state, ...state };
  download.listeners.forEach((listener) => listener());
};

const remove = (url: string, download: Download) => {
  downloads.delete(url);
  if (download.state.objectUrl) URL.revokeObjectURL(download.state.objectUrl);
};

const evictUnused = () => {
  let unusedBytes = 0;
  for (const download of downloads.values()) {
    if (download.users === 0) unusedBytes += download.state.blob?.size ?? 0;
  }
  for (const [url, download] of downloads) {
    if (unusedBytes <= UNUSED_BUDGET_BYTES) break;
    if (download.users > 0 || !download.state.blob) continue;
    unusedBytes -= download.state.blob.size;
    remove(url, download);
  }
};

const start = (url: string): Download => {
  const download: Download = {
    state: LOADING,
    users: 0,
    listeners: new Set(),
    controller: new AbortController(),
  };
  downloads.set(url, download);

  fetch(url, { credentials: "include", signal: download.controller.signal })
    .then((response) => response.blob())
    .then((blob) => {
      if (downloads.get(url) !== download) return;
      update(download, {
        objectUrl: URL.createObjectURL(blob),
        blob,
        isLoading: false,
      });
      evictUnused();
    })
    .catch((error) => {
      if (downloads.get(url) !== download) return;
      update(download, { error, isLoading: false });
    });
  return download;
};

const acquire = (url: string, listener: () => void) => {
  const download = downloads.get(url) ?? start(url);
  download.users++;
  download.listeners.add(listener);

  return () => {
    download.listeners.delete(listener);
    download.users--;
    if (download.users > 0) return;
    // Released on the next tick, as remounting (e.g. in StrictMode) acquires
    // the download right away again
    setTimeout(() => {
      if (download.users > 0 || downloads.get(url) !== download) return;
      if (download.state.isLoading) {
        // Nobody waits for it anymore, e.g. a thumbnail scrolled past
        download.controller.abort();
        remove(url, download);
      } else if (download.state.error) {
        // Tried again the next time it is shown
        remove(url, download);
      } else {
        downloads.delete(url);
        downloads.set(url, download);
        evictUnused();
      }
    });
  };
};

export const useFileDownload = (url: string, skip = false) => {
  const subscribe = useCallback(
    (listener: () => void) => (skip ? () => {} : acquire(url, listener)),
    [url, skip],
  );
  const getSnapshot = () =>
    skip ? SKIPPED : (downloads.get(url)?.state ?? LOADING);
  const state = useSyncExternalStore(subscribe, getSnapshot);

  return { ...state, remoteUrl: url };
};
