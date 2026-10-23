import { useCallback, useMemo, useState } from "react";
import { type Document, type ListDocumentsArgs } from "../app/api";
import type { CursorPaginatedResponse } from "../util/PaginatedResponse";
import { setPagePosition, type PagePosition } from "./useCursorPageParams";
import { useDocumentIndex } from "./useDocumentIndex";

// Documents kept loaded on either side of the previewed one, so arrow
// navigation and the diashow don't wait for the next window
const READ_AHEAD = 5;
const DEFAULT_STRIP_RADIUS = 4;

type Params = {
  previewDocumentSearchParam: string | undefined;
  // Filter / sort of the gallery the preview navigates through
  queryArgs: Pick<ListDocumentsArgs, "query" | "seed">;
  // Currently displayed gallery page, kept in sync while navigating
  galleryPage: CursorPaginatedResponse<Document> | undefined;
  limit: number;
  removeSearchParam: (key: "preview") => void;
  setSearchParams: (
    updater: (prev: URLSearchParams) => URLSearchParams,
  ) => void;
};

export type FilmstripSlot = {
  index: number;
  // Not loaded yet
  document: Document | undefined;
};

export type Filmstrip = {
  slots: FilmstripSlot[];
  // Index shown in the middle of the strip
  centerIndex: number;
  currentIndex: number;
  // Distance of the strip center from the current document
  offset: number;
  setOffset: (update: (offset: number) => number) => void;
  // Slots visible on either side of the center
  setRadius: (radius: number) => void;
};

// Window sizes are rounded so resizing doesn't refetch on every pixel
const windowSizeFor = (radius: number) =>
  Math.min(100, Math.ceil((2 * (radius + READ_AHEAD) + 1) / 10) * 10);

export const usePreviewNavigation = ({
  previewDocumentSearchParam,
  queryArgs,
  galleryPage,
  limit,
  removeSearchParam,
  setSearchParams,
}: Params) => {
  const [stripRadius, setStripRadius] = useState(DEFAULT_STRIP_RADIUS);
  const [stripOffset, setStripOffset] = useState(0);

  // Navigating re-centers the strip on the new document
  const [offsetDocumentId, setOffsetDocumentId] = useState(
    previewDocumentSearchParam,
  );
  if (offsetDocumentId !== previewDocumentSearchParam) {
    setOffsetDocumentId(previewDocumentSearchParam);
    setStripOffset(0);
  }

  // Position of the previewed document, kept while the next one loads
  const [currentIndex, setCurrentIndex] = useState(0);
  const centerIndex = currentIndex + stripOffset;

  // The preview loads the neighbourhood of the previewed document itself, so
  // it works independently of which gallery page is loaded.
  const {
    byIndex,
    byId: knownDocuments,
    total,
  } = useDocumentIndex({
    queryArgs,
    extraPage: galleryPage,
    anchorId: previewDocumentSearchParam,
    range: previewDocumentSearchParam
      ? [
          Math.min(currentIndex - READ_AHEAD, centerIndex - stripRadius - 1),
          Math.max(currentIndex + READ_AHEAD, centerIndex + stripRadius + 1),
        ]
      : undefined,
    windowSize: windowSizeFor(stripRadius),
  });

  const previewDocument = previewDocumentSearchParam
    ? knownDocuments.get(previewDocumentSearchParam)
    : undefined;

  if (previewDocument && previewDocument.queryIndex !== currentIndex) {
    setCurrentIndex(previewDocument.queryIndex);
  }

  const totalDocuments = total ?? 0;

  const setOffset = useCallback(
    (update: (offset: number) => number) =>
      setStripOffset((prev) =>
        Math.max(
          -currentIndex,
          Math.min(totalDocuments - 1 - currentIndex, update(prev)),
        ),
      ),
    [currentIndex, totalDocuments],
  );

  const filmstrip = useMemo((): Filmstrip => {
    const slots: FilmstripSlot[] = [];
    // One extra slot on each side, so documents slide in from the edges
    const from = Math.max(0, centerIndex - stripRadius - 1);
    const to = Math.min(totalDocuments - 1, centerIndex + stripRadius + 1);
    for (let index = from; index <= to; index++) {
      slots.push({ index, document: byIndex.get(index) });
    }
    return {
      slots,
      centerIndex,
      currentIndex,
      offset: stripOffset,
      setOffset,
      setRadius: setStripRadius,
    };
  }, [
    byIndex,
    centerIndex,
    currentIndex,
    stripOffset,
    stripRadius,
    totalDocuments,
    setOffset,
  ]);

  // Gallery page that contains `target`, or undefined if the current one does.
  // Prefers the regular previous / next page so that following the preview
  // across a page boundary is equivalent to using the gallery pagination.
  const galleryPositionFor = useCallback(
    (target: Document): PagePosition | undefined => {
      if (!galleryPage || galleryPage.items.some((d) => d.id === target.id)) {
        return undefined;
      }
      const first = galleryPage.startIndex;
      const last = first + galleryPage.items.length - 1;
      if (
        galleryPage.nextCursor &&
        target.queryIndex > last &&
        target.queryIndex <= last + limit
      ) {
        return { after: galleryPage.nextCursor };
      }
      if (
        galleryPage.prevCursor &&
        target.queryIndex < first &&
        target.queryIndex >= first - limit
      ) {
        return { before: galleryPage.prevCursor };
      }
      // Further away: start a page right at the target
      const predecessor = target.previousId
        ? knownDocuments.get(target.previousId)
        : undefined;
      if (predecessor?.cursor) return { after: predecessor.cursor };
      if (!target.previousId) return {};
      return undefined;
    },
    [galleryPage, knownDocuments, limit],
  );

  const goToPreviewDocumentId = useCallback(
    (documentId: string) => {
      const target = knownDocuments.get(documentId);
      const position = target ? galleryPositionFor(target) : undefined;
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (position) setPagePosition(next, position);
        next.set("preview", documentId);
        return next;
      });
    },
    [knownDocuments, galleryPositionFor, setSearchParams],
  );

  const setPreviewDocument = useCallback(
    (previewDocumentId: string | undefined) => {
      if (previewDocumentId) {
        goToPreviewDocumentId(previewDocumentId);
      } else {
        removeSearchParam("preview");
      }
    },
    [goToPreviewDocumentId, removeSearchParam],
  );

  const goToPreviewDocument = useCallback(
    (document: Document) => goToPreviewDocumentId(document.id),
    [goToPreviewDocumentId],
  );

  const nextPreviewImage = useCallback(() => {
    if (previewDocument?.nextId) goToPreviewDocumentId(previewDocument.nextId);
  }, [previewDocument, goToPreviewDocumentId]);

  const prevPreviewImage = useCallback(() => {
    if (previewDocument?.previousId)
      goToPreviewDocumentId(previewDocument.previousId);
  }, [previewDocument, goToPreviewDocumentId]);

  return {
    previewDocument,
    filmstrip,
    totalDocuments,
    setPreviewDocument,
    goToPreviewDocument,
    nextPreviewImage,
    prevPreviewImage,
    previewIndex: currentIndex,
  };
};
