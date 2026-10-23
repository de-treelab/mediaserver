import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import type { ListDocumentsArgs } from "../app/api";
import { useDocumentIndex } from "./useDocumentIndex";

// Search parameter holding the first visible document. A document id rather
// than a position, so the URL keeps pointing at the same documents when some
// are added or removed in between.
const POSITION_PARAM = "around";

export const GALLERY_WINDOW_SIZE = 60;
const MAX_WINDOWS = 8;
// Delay before the scroll position is written to the URL
const WRITE_DELAY = 300;

export type ScrollRequest = { index: number; align: "start" | "nearest" };

/** Makes the gallery start over at the top. */
export const clearGalleryPosition = (params: URLSearchParams) =>
  params.delete(POSITION_PARAM);

type Params = {
  queryArgs: Pick<ListDocumentsArgs, "query" | "seed">;
  // Nothing is loaded while disabled (e.g. waiting for the random seed)
  enabled: boolean;
};

/**
 * Documents of the infinitely scrolling gallery: loads the windows around the
 * visible range and keeps the first visible document in the URL, restoring
 * the scroll position from it whenever the URL changes other than by
 * scrolling.
 */
export const useGalleryPosition = ({ queryArgs, enabled }: Params) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const positionParam = searchParams.get(POSITION_PARAM) ?? undefined;

  // Inclusive range of query indices in view, as reported by the grid
  const [visibleRange, setVisibleRange] = useState<[number, number]>([0, -1]);
  const [scrollRequest, setScrollRequest] = useState<ScrollRequest>();

  // The visible range moves to the target right away, so that the windows at
  // the previous position aren't loaded while the grid scrolls there
  const scrollToIndex = useCallback(
    (index: number, align: ScrollRequest["align"]) => {
      setScrollRequest({ index, align });
      setVisibleRange([index, index]);
    },
    [],
  );

  // Document to scroll to once its position is known
  const [restoreId, setRestoreId] = useState(positionParam);
  // Last value written to the URL by scrolling
  const [writtenParam, setWrittenParam] = useState<string>();
  const [seenParam, setSeenParam] = useState(positionParam);
  if (seenParam !== positionParam) {
    setSeenParam(positionParam);
    if (positionParam !== writtenParam) {
      setRestoreId(positionParam);
      if (!positionParam) scrollToIndex(0, "start");
    }
  }

  // Load a screen ahead in either direction. Nothing besides the anchor is
  // needed while restoring, the visible range is outdated until then.
  const ranges = useMemo((): [number, number][] => {
    if (!enabled || restoreId) return [];
    const [first, last] = visibleRange;
    const span = Math.max(last - first + 1, GALLERY_WINDOW_SIZE / 2);
    return [[first - span, last + span]];
  }, [enabled, restoreId, visibleRange]);

  const { byIndex, byId, total, pages, anchorMissing } = useDocumentIndex({
    queryArgs,
    anchorId: enabled ? restoreId : undefined,
    ranges,
    windowSize: GALLERY_WINDOW_SIZE,
    maxWindows: MAX_WINDOWS,
  });

  useEffect(() => {
    if (!restoreId) return;
    const document = byId.get(restoreId);
    if (document) {
      scrollToIndex(document.queryIndex, "start");
      setRestoreId(undefined);
    } else if (anchorMissing) {
      scrollToIndex(0, "start");
      setRestoreId(undefined);
    }
  }, [restoreId, byId, anchorMissing, scrollToIndex]);

  useEffect(() => {
    if (restoreId) return;
    const timeout = setTimeout(() => {
      const [first] = visibleRange;
      // The top of the gallery needs no parameter
      const id = first > 0 ? byIndex.get(first)?.id : undefined;
      if ((first > 0 && !id) || id === positionParam) return;
      setWrittenParam(id);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (id) next.set(POSITION_PARAM, id);
          else next.delete(POSITION_PARAM);
          return next;
        },
        { replace: true },
      );
    }, WRITE_DELAY);
    return () => clearTimeout(timeout);
  }, [restoreId, visibleRange, byIndex, positionParam, setSearchParams]);

  const onScrollRequestDone = useCallback(
    () => setScrollRequest(undefined),
    [],
  );

  return {
    byIndex,
    byId,
    total,
    pages,
    visibleRange,
    onVisibleRangeChange: setVisibleRange,
    scrollRequest,
    onScrollRequestDone,
    scrollToIndex,
  };
};
