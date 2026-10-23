import { enhancedApi } from "../app/enhancedApi";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PreviewContainer } from "../sections/PreviewContainer";
import { useEasySearchParams } from "../hooks/useEasySearchParams";
import {
  clearPagePosition,
  useCursorPageParams,
} from "../hooks/useCursorPageParams";
import { END_CURSOR } from "../app/api";
import { CollectionFormModal } from "../sections/CollectionFormModal";
import { useGallerySeed } from "../hooks/useGallerySeed";
import { BulkEditDocumentsModal } from "../sections/BulkEditDocumentsModal";
import { skipToken } from "@reduxjs/toolkit/query";
import { CollectionBadge } from "../components/CollectionBadge";
import { useFinalGalleryQuery } from "../hooks/useFinalGalleryQuery";
import { usePreviewNavigation } from "../hooks/usePreviewNavigation";
import { EditModePanel } from "../sections/EditModePanel";
import { GallerySearchBar } from "../sections/GallerySearchBar";
import { GalleryControls } from "../sections/GalleryControls";
import { PaginatedThumbnailContainer } from "../sections/PaginatedThumbnailContainer";
import { useNavigate } from "react-router";
import { usePermission } from "../hooks/usePermission";
import { AiOutlineUpload } from "react-icons/ai";
import { MdEdit } from "react-icons/md";
import { Button } from "../components/Button";
import { useTranslation } from "react-i18next";
import { twMerge } from "tailwind-merge";
import { PageHeader } from "../components/Page";
import { pageGutter } from "../components/styles";

export const GalleryPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const canUpload = usePermission("document:upload");
  const [layoutType, setLayoutType] = useState<"grid" | "list">("grid");
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [createCollection] = enhancedApi.useCreateCollectionMutation();
  const [editMode, setEditMode] = useState(false);
  const [editDocuments, setEditDocuments] = useState<Set<string>>(new Set());
  const [editDocumentsModalOpen, setEditDocumentsModalOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const { limit, position, setPosition, resetPosition } = useCursorPageParams();

  const {
    params: {
      preview: previewDocumentSearchParam,
      q: query,
      collection: collectionSearchParam,
      sort: sortParam,
    },
    setSearchParams,
    removeSearchParam,
  } = useEasySearchParams(["preview", "q", "collection", "sort"]);

  const sortMode: "newest" | "random" =
    sortParam === "random" ? "random" : "newest";

  const { data: collection } = enhancedApi.useGetCollectionByIdQuery(
    collectionSearchParam ?? skipToken,
  );

  const { data: allTagsData } = enhancedApi.useListTagsQuery({
    limit: 20,
    offset: 0,
    query: "",
  });
  const popularTags = useMemo(() => {
    if (!allTagsData) return [];
    return allTagsData.items
      .filter((tag) => tag.type !== "meta" && tag.type !== "collection")
      .slice(0, 5);
  }, [allTagsData]);

  const effectiveQuery = useMemo(() => {
    const combined = query?.trim() ?? "";

    if (sortMode === "random" && !combined.includes("sort:random")) {
      return combined ? `(sort:random) & (${combined})` : "(sort:random)";
    }
    return combined || undefined;
  }, [query, sortMode]);

  const { finalQuery, hasRandomSort } = useFinalGalleryQuery(
    effectiveQuery,
    collectionSearchParam,
    collection,
  );

  const { seed, reseedGallery } = useGallerySeed(hasRandomSort);

  const queryArgs = useMemo(
    () => ({ query: finalQuery, seed }),
    [finalQuery, seed],
  );

  const { currentData: data } = enhancedApi.useListDocumentsQuery(
    // Wait for the seed to be written to the URL before fetching random pages
    hasRandomSort && !seed ? skipToken : { ...queryArgs, limit, ...position },
    { refetchOnFocus: true, refetchOnReconnect: true },
  );

  // Every document past / before the cursor is gone (e.g. deleted or no longer
  // matching): fall back to the last / first page.
  useEffect(() => {
    if (!data || data.items.length > 0 || data.total === 0) return;
    if (position.after) setPosition({ before: END_CURSOR });
    else if (position.before && position.before !== END_CURSOR) resetPosition();
  }, [data, position, setPosition, resetPosition]);

  useEffect(() => {
    setEditDocuments(new Set());
  }, [editMode]);

  useEffect(() => {
    setTagInput((prev) => query || prev);
  }, [query]);

  const total = data?.total ?? 0;

  const {
    previewDocument,
    filmstrip,
    totalDocuments,
    setPreviewDocument,
    goToPreviewDocument,
    nextPreviewImage,
    prevPreviewImage,
    previewIndex,
  } = usePreviewNavigation({
    previewDocumentSearchParam,
    queryArgs,
    galleryPage: data,
    limit,
    removeSearchParam,
    setSearchParams,
  });

  // Changes the filter and starts over at the first page. Done in a single
  // update since consecutive setSearchParams calls would overwrite each other.
  const updateFilter = useCallback(
    (update: (params: URLSearchParams) => void) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        update(next);
        clearPagePosition(next);
        return next;
      });
    },
    [setSearchParams],
  );

  const onInputSubmit = useCallback(
    (value: string) => updateFilter((params) => params.set("q", value)),
    [updateFilter],
  );

  const onTagClick = useCallback(
    (tag: string) => {
      const current = tagInput.trim();
      const newQuery = current ? `${current} & ${tag}` : tag;
      setTagInput(newQuery);
      onInputSubmit(newQuery);
    },
    [tagInput, onInputSubmit],
  );

  // Switching to random sort picks up a fresh seed, as useGallerySeed drops
  // the seed from the URL whenever random sort is off.
  const onSetSortMode = useCallback(
    (mode: "newest" | "random") =>
      updateFilter((params) => {
        if (mode === "random") {
          params.set("sort", "random");
        } else {
          params.delete("sort");
        }
      }),
    [updateFilter],
  );

  const entirePageSelected = useMemo(
    () => !!data && data.items.every((item) => editDocuments.has(item.id)),
    [data, editDocuments],
  );

  const onTogglePage = useCallback(() => {
    setEditDocuments((old) => {
      const newSet = new Set(old);
      const ids = data?.items.map((d) => d.id) ?? [];
      if (entirePageSelected) {
        ids.forEach((id) => newSet.delete(id));
      } else {
        ids.forEach((id) => newSet.add(id));
      }
      return newSet;
    });
  }, [data, entirePageSelected]);

  const onThumbnailClick = useCallback(
    (id: string) => {
      if (!editMode) {
        setPreviewDocument(id);
      } else {
        setEditDocuments((documents) => {
          const newSet = new Set(documents);
          if (newSet.has(id)) {
            newSet.delete(id);
          } else {
            newSet.add(id);
          }
          return newSet;
        });
      }
    },
    [editMode, setPreviewDocument],
  );

  const onSelectDocument = useCallback((id: string, selected: boolean) => {
    setEditDocuments((documents) => {
      const newSet = new Set(documents);
      if (selected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  }, []);

  return (
    <div className="h-full relative flex flex-col gap-3 pt-4 sm:pt-6 overflow-hidden">
      <PageHeader
        className={twMerge(pageGutter, "shrink-0")}
        title={t("pages.gallery.title")}
        actions={
          <>
            {canUpload && (
              <Button variant="secondary" onClick={() => navigate("/upload")}>
                <AiOutlineUpload className="text-lg" />
                {t("pages.gallery.upload")}
              </Button>
            )}
            <Button
              variant={editMode ? "primary" : "secondary"}
              onClick={() => setEditMode((prev) => !prev)}
            >
              <MdEdit className="text-lg" />
              {t("pages.gallery.bulkEdit")}
            </Button>
          </>
        }
      />

      <GallerySearchBar
        value={tagInput}
        onChange={setTagInput}
        onSubmit={onInputSubmit}
        popularTags={popularTags}
        onTagClick={onTagClick}
      />

      {collectionSearchParam && collection && (
        <div className={twMerge(pageGutter, "flex flex-row gap-2 shrink-0")}>
          <CollectionBadge
            collection={collection}
            onDelete={() =>
              updateFilter((params) => params.delete("collection"))
            }
          />
        </div>
      )}

      {editMode && (
        <EditModePanel
          editDocuments={editDocuments}
          entirePageSelected={entirePageSelected}
          onTogglePage={onTogglePage}
          onClearSelection={() => setEditDocuments(new Set())}
          onOpenBulkEdit={() => setEditDocumentsModalOpen(true)}
          onCancel={() => setEditMode(false)}
        />
      )}

      <GalleryControls
        hasRandomSort={hasRandomSort}
        onReseed={reseedGallery}
        hasQuery={!!query}
        onSaveCollection={() => setCollectionModalOpen(true)}
        layoutType={layoutType}
        onSetLayoutType={setLayoutType}
        sortMode={sortMode}
        onSetSortMode={onSetSortMode}
        total={total}
        pageSize={data?.items.length ?? 0}
      />

      <PaginatedThumbnailContainer
        items={data?.items ?? []}
        total={total}
        startIndex={data?.startIndex ?? 0}
        prevCursor={data?.prevCursor}
        nextCursor={data?.nextCursor}
        onPositionChange={setPosition}
        layoutType={layoutType}
        selectedDocuments={editDocuments}
        onThumbnailClick={onThumbnailClick}
        onSelect={editMode ? onSelectDocument : undefined}
        popularTags={popularTags}
      />

      <CollectionFormModal
        isOpen={collectionModalOpen}
        onClose={() => setCollectionModalOpen(false)}
        onSave={async (data) => {
          await createCollection({ ...data, type: "dynamic" });
          setCollectionModalOpen(false);
        }}
        initialFilterExpression={query}
      />
      <BulkEditDocumentsModal
        documentIds={Array.from(editDocuments)}
        isOpen={editDocumentsModalOpen}
        onAbort={() => setEditDocumentsModalOpen(false)}
        onConfirm={() => {
          setEditDocumentsModalOpen(false);
          setEditDocuments(new Set());
          setEditMode(false);
        }}
      />
      {previewDocumentSearchParam && (
        <div className="fixed top-0 left-0 w-screen h-screen bg-black z-100">
          <PreviewContainer
            totalDocuments={totalDocuments}
            previewImageId={previewDocumentSearchParam}
            previewDocument={previewDocument}
            filmstrip={filmstrip}
            onThumbnailClicked={goToPreviewDocument}
            nextPreviewImage={nextPreviewImage}
            previousPreviewImage={prevPreviewImage}
            previewImageIndex={previewIndex}
            onClose={() => setPreviewDocument(undefined)}
          />
        </div>
      )}
    </div>
  );
};
