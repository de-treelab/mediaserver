import { useEffect, useMemo, useState } from "react";
import { shallowEqual } from "react-redux";
import type { Document, ListDocumentsArgs } from "../app/api";
import { enhancedApi } from "../app/enhancedApi";
import { useAppDispatch, useAppSelector } from "../app/store";
import type { CursorPaginatedResponse } from "../util/PaginatedResponse";

// Windows kept subscribed at once, unless all of them are still needed
const MAX_WINDOWS = 6;

type QueryArgs = Pick<ListDocumentsArgs, "query" | "seed">;

// Fetched either around a document whose position is unknown, or at a
// position. Positions are multiples of the window size, so that the windows
// tile the listing and are reused while browsing.
type Window = { around: string } | { at: number };

type Params = {
  queryArgs: QueryArgs;
  // Page loaded elsewhere (e.g. the gallery page) that may fill gaps
  extraPage: CursorPaginatedResponse<Document> | undefined;
  // Document that has to be known; a window around it is fetched if needed
  anchorId: string | undefined;
  // Inclusive ranges of query indices that should be loaded
  ranges: [number, number][];
  windowSize: number;
};

const windowKey = (window: Window) =>
  "around" in window ? `around:${window.around}` : `at:${window.at}`;

const windowArgs = (
  queryArgs: QueryArgs,
  window: Window,
  limit: number,
): ListDocumentsArgs => ({ ...queryArgs, ...window, limit });

const overlaps = ([from, to]: [number, number], ranges: [number, number][]) =>
  ranges.some(([rangeFrom, rangeTo]) => from <= rangeTo && to >= rangeFrom);

/**
 * Index of the documents of a listing by their position, assembled from
 * windows of `windowSize` documents. Fetches further windows whenever part of
 * `ranges` is unknown.
 */
export const useDocumentIndex = ({
  queryArgs,
  extraPage,
  anchorId,
  ranges,
  windowSize,
}: Params) => {
  const dispatch = useAppDispatch();
  const [windows, setWindows] = useState<Window[]>([]);

  // Windows of a different filter / sort are useless, start over
  const [windowsQueryArgs, setWindowsQueryArgs] = useState(queryArgs);
  if (windowsQueryArgs !== queryArgs) {
    setWindowsQueryArgs(queryArgs);
    setWindows([]);
  }

  useEffect(() => {
    const subscriptions = windows.map((window) =>
      dispatch(
        enhancedApi.endpoints.listDocuments.initiate(
          windowArgs(queryArgs, window, windowSize),
          {
            subscriptionOptions: {
              refetchOnFocus: true,
              refetchOnReconnect: true,
            },
          },
        ),
      ),
    );
    return () => subscriptions.forEach((s) => s.unsubscribe());
  }, [dispatch, windows, queryArgs, windowSize]);

  // Flattened [data, fulfilledTimeStamp, isLoading] per window so that
  // shallowEqual only re-renders on actual changes.
  const windowState = useAppSelector(
    (state) =>
      windows.flatMap((window) => {
        const entry = enhancedApi.endpoints.listDocuments.select(
          windowArgs(queryArgs, window, windowSize),
        )(state);
        return [entry.data, entry.fulfilledTimeStamp, entry.isLoading];
      }),
    shallowEqual,
  );

  const { byIndex, byId, total, isLoading, coverage } = useMemo(() => {
    const loaded: {
      page: CursorPaginatedResponse<Document>;
      fulfilled: number;
    }[] = [];
    // Inclusive range of query indices each loaded window holds, by key
    const coverage = new Map<string, [number, number]>();
    let isLoading = false;
    for (let i = 0; i < windowState.length; i += 3) {
      const page = windowState[i] as
        | CursorPaginatedResponse<Document>
        | undefined;
      if (page) {
        loaded.push({ page, fulfilled: windowState[i + 1] as number });
        coverage.set(windowKey(windows[i / 3]), [
          page.startIndex,
          page.startIndex + page.items.length - 1,
        ]);
      }
      isLoading ||= windowState[i + 2] as boolean;
    }
    loaded.sort((a, b) => a.fulfilled - b.fulfilled);

    // Positions shift when documents are added or removed. The most recently
    // fetched window decides the current total; pages disagreeing with it are
    // outdated and get ignored until they are refetched.
    const total = loaded.at(-1)?.page.total ?? extraPage?.total;
    const pages = [extraPage, ...loaded.map((w) => w.page)].filter(
      (page): page is CursorPaginatedResponse<Document> =>
        page !== undefined && page.total === total,
    );

    const byIndex = new Map<number, Document>();
    const byId = new Map<string, Document>();
    for (const page of pages) {
      for (const document of page.items) {
        byIndex.set(document.queryIndex, document);
        byId.set(document.id, document);
      }
    }
    return { byIndex, byId, total, isLoading, coverage };
  }, [windowState, windows, extraPage]);

  // Windows to fetch next: around the anchor document if it is unknown, as
  // its position is needed first. Else the windows at the gaps in `ranges`.
  const missingWindows = useMemo((): Window[] => {
    if (anchorId && !byId.has(anchorId)) return [{ around: anchorId }];
    if (total === undefined) return [];
    const missing = new Map<string, Window>();
    for (const [from, to] of ranges) {
      for (
        let index = Math.max(0, from);
        index <= Math.min(total - 1, to);
        index++
      ) {
        if (byIndex.has(index)) continue;
        const window = { at: index - (index % windowSize) };
        missing.set(windowKey(window), window);
      }
    }
    return [...missing.values()];
  }, [anchorId, byId, byIndex, ranges, total, windowSize]);

  // Wait for pending windows, they might fill the gaps already
  useEffect(() => {
    if (missingWindows.length === 0 || isLoading) return;
    setWindows((prev) => {
      const known = new Set(prev.map(windowKey));
      const added = missingWindows.filter((w) => !known.has(windowKey(w)));
      if (added.length === 0) return prev;
      // Drop the least recently added windows that hold none of the requested
      // positions. Windows still needed are kept, as dropping them would only
      // cause them to be fetched again.
      const next = [...prev, ...added];
      let excess = next.length - MAX_WINDOWS;
      return next.filter((window, i) => {
        if (excess <= 0 || i >= prev.length) return true;
        const covered = coverage.get(windowKey(window));
        if (covered === undefined || overlaps(covered, ranges)) return true;
        excess--;
        return false;
      });
    });
  }, [missingWindows, isLoading, coverage, ranges]);

  return { byIndex, byId, total };
};
