import { useEffect, useMemo, useState } from "react";
import { shallowEqual } from "react-redux";
import type { Document, ListDocumentsArgs } from "../app/api";
import { enhancedApi } from "../app/enhancedApi";
import { useAppDispatch, useAppSelector } from "../app/store";
import type { CursorPaginatedResponse } from "../util/PaginatedResponse";

// Windows kept subscribed at once; the least recently added one is dropped
const MAX_WINDOWS = 6;

type QueryArgs = Pick<ListDocumentsArgs, "query" | "seed">;

type Params = {
  queryArgs: QueryArgs;
  // Page loaded elsewhere (e.g. the gallery page) that may fill gaps
  extraPage: CursorPaginatedResponse<Document> | undefined;
  // Document that has to be known; a window around it is fetched if needed
  anchorId: string | undefined;
  // Inclusive range of query indices that should be loaded
  range: [number, number] | undefined;
  windowSize: number;
};

const windowArgs = (
  queryArgs: QueryArgs,
  around: string,
  limit: number,
): ListDocumentsArgs => ({ ...queryArgs, around, limit });

/**
 * Index of the documents of a listing by their position, assembled from
 * windows fetched around individual documents. Fetches further windows
 * whenever part of `range` is unknown.
 */
export const useDocumentIndex = ({
  queryArgs,
  extraPage,
  anchorId,
  range,
  windowSize,
}: Params) => {
  const dispatch = useAppDispatch();
  const [anchors, setAnchors] = useState<string[]>([]);

  // Windows of a different filter / sort are useless, start over
  const [anchorsQueryArgs, setAnchorsQueryArgs] = useState(queryArgs);
  if (anchorsQueryArgs !== queryArgs) {
    setAnchorsQueryArgs(queryArgs);
    setAnchors([]);
  }

  useEffect(() => {
    const subscriptions = anchors.map((id) =>
      dispatch(
        enhancedApi.endpoints.listDocuments.initiate(
          windowArgs(queryArgs, id, windowSize),
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
  }, [dispatch, anchors, queryArgs, windowSize]);

  // Flattened [data, fulfilledTimeStamp, isLoading] per anchor so that
  // shallowEqual only re-renders on actual changes.
  const windowState = useAppSelector(
    (state) =>
      anchors.flatMap((id) => {
        const entry = enhancedApi.endpoints.listDocuments.select(
          windowArgs(queryArgs, id, windowSize),
        )(state);
        return [entry.data, entry.fulfilledTimeStamp, entry.isLoading];
      }),
    shallowEqual,
  );

  const { byIndex, byId, total, isLoading } = useMemo(() => {
    const windows: {
      page: CursorPaginatedResponse<Document>;
      fulfilled: number;
    }[] = [];
    let isLoading = false;
    for (let i = 0; i < windowState.length; i += 3) {
      const page = windowState[i] as
        | CursorPaginatedResponse<Document>
        | undefined;
      if (page) {
        windows.push({ page, fulfilled: windowState[i + 1] as number });
      }
      isLoading ||= windowState[i + 2] as boolean;
    }
    windows.sort((a, b) => a.fulfilled - b.fulfilled);

    // Positions shift when documents are added or removed. The most recently
    // fetched window decides the current total; pages disagreeing with it are
    // outdated and get ignored until they are refetched.
    const total = windows.at(-1)?.page.total ?? extraPage?.total;
    const pages = [extraPage, ...windows.map((w) => w.page)].filter(
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
    return { byIndex, byId, total, isLoading };
  }, [windowState, extraPage]);

  // Next window to fetch: around the anchor document if it is unknown, else
  // around the known document closest to the first gap in `range`.
  const missingAnchor = useMemo(() => {
    if (anchorId && !byId.has(anchorId)) return anchorId;
    if (!range || total === undefined) return undefined;
    const from = Math.max(0, range[0]);
    const to = Math.min(total - 1, range[1]);
    for (let index = from; index <= to; index++) {
      if (byIndex.has(index)) continue;
      for (let distance = 1; distance < total; distance++) {
        const nearest =
          byIndex.get(index - distance) ?? byIndex.get(index + distance);
        if (nearest) return nearest.id;
      }
      return undefined;
    }
    return undefined;
  }, [anchorId, byId, byIndex, range, total]);

  // Wait for pending windows, they might fill the gap already
  useEffect(() => {
    if (!missingAnchor || isLoading) return;
    setAnchors((prev) =>
      prev.includes(missingAnchor)
        ? prev
        : [...prev, missingAnchor].slice(-MAX_WINDOWS),
    );
  }, [missingAnchor, isLoading]);

  return { byIndex, byId, total };
};
