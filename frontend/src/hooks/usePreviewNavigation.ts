import { useCallback, useEffect, useMemo, useRef } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { type Document, type ListDocumentsArgs } from "../app/api";
import { enhancedApi } from "../app/enhancedApi";
import type { CursorPaginatedResponse } from "../util/PaginatedResponse";
import { setPagePosition, type PagePosition } from "./useCursorPageParams";

// Documents shown in the preview strip: the previewed one plus two on either side
const STRIP_SIZE = 5;

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

const stripArgs = (
  queryArgs: Params["queryArgs"],
  documentId: string,
): ListDocumentsArgs => ({
  ...queryArgs,
  around: documentId,
  limit: STRIP_SIZE,
});

export const usePreviewNavigation = ({
  previewDocumentSearchParam,
  queryArgs,
  galleryPage,
  limit,
  removeSearchParam,
  setSearchParams,
}: Params) => {
  // The preview fetches its own window around the previewed document, so it
  // works independently of which gallery page is loaded.
  const { data: strip } = enhancedApi.useListDocumentsQuery(
    previewDocumentSearchParam
      ? stripArgs(queryArgs, previewDocumentSearchParam)
      : skipToken,
    { refetchOnFocus: true, refetchOnReconnect: true },
  );

  const knownDocuments = useMemo(
    () =>
      new Map(
        [...(galleryPage?.items ?? []), ...(strip?.items ?? [])].map((d) => [
          d.id,
          d,
        ]),
      ),
    [galleryPage, strip],
  );

  const previewDocument = previewDocumentSearchParam
    ? knownDocuments.get(previewDocumentSearchParam)
    : undefined;

  // `strip` keeps the previous window while the next one loads; only show it
  // once it contains the previewed document.
  const stripDocuments = useMemo(
    () =>
      strip?.items.some((d) => d.id === previewDocumentSearchParam)
        ? strip.items
        : [],
    [strip, previewDocumentSearchParam],
  );

  const lastKnownPreviewIndexRef = useRef<number>(0);
  if (previewDocument) {
    lastKnownPreviewIndexRef.current = previewDocument.queryIndex;
  }

  // Read ahead in both directions so arrow navigation and the diashow don't
  // wait for the next strip.
  const prefetch = enhancedApi.usePrefetch("listDocuments");
  useEffect(() => {
    for (const id of [previewDocument?.nextId, previewDocument?.previousId]) {
      if (id) prefetch(stripArgs(queryArgs, id));
    }
  }, [
    prefetch,
    queryArgs,
    previewDocument?.nextId,
    previewDocument?.previousId,
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
    stripDocuments,
    totalDocuments: strip?.total ?? galleryPage?.total ?? 0,
    setPreviewDocument,
    goToPreviewDocument,
    nextPreviewImage,
    prevPreviewImage,
    lastKnownPreviewIndexRef,
  };
};
