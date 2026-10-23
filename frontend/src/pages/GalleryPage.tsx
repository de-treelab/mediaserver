import { enhancedApi } from "../app/enhancedApi";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PreviewContainer } from "../sections/PreviewContainer";
import { useEasySearchParams } from "../hooks/useEasySearchParams";
import {
  clearGalleryPosition,
  GALLERY_WINDOW_SIZE,
  useGalleryPosition,
} from "../hooks/useGalleryPosition";
import { CollectionFormModal } from "../sections/CollectionFormModal";
import { useGallerySeed } from "../hooks/useGallerySeed";
import { useDocumentSelection } from "../hooks/useDocumentSelection";
import { BulkEditDocumentsModal } from "../sections/BulkEditDocumentsModal";
import { skipToken } from "@reduxjs/toolkit/query";
import { CollectionBadge } from "../components/CollectionBadge";
import { useFinalGalleryQuery } from "../hooks/useFinalGalleryQuery";
import { usePreviewNavigation } from "../hooks/usePreviewNavigation";
import { EditModePanel } from "../sections/EditModePanel";
import { GallerySearchBar } from "../sections/GallerySearchBar";
import { GalleryControls } from "../sections/GalleryControls";
import { VirtualThumbnailGrid } from "../sections/VirtualThumbnailGrid";
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
  const [editDocumentsModalOpen, setEditDocumentsModalOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");

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

  const {
    byIndex,
    byId,
    total: loadedTotal,
    pages,
    visibleRange,
    onVisibleRangeChange,
    scrollRequest,
    onScrollRequestDone,
    scrollToIndex,
  } = useGalleryPosition({
    queryArgs,
    // Wait for the seed to be written to the URL before fetching random pages
    enabled: !hasRandomSort || !!seed,
  });

  const total = loadedTotal ?? 0;

  const selection = useDocumentSelection(finalQuery ?? "", total);
  const clearSelection = selection.clear;

  useEffect(() => {
    clearSelection();
  }, [editMode, clearSelection]);

  useEffect(() => {
    setTagInput((prev) => query || prev);
  }, [query]);

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
    galleryPages: pages,
    removeSearchParam,
    setSearchParams,
  });

  // Closing the preview shows the gallery around the last previewed document
  const [shownPreview, setShownPreview] = useState(previewDocumentSearchParam);
  if (shownPreview !== previewDocumentSearchParam) {
    setShownPreview(previewDocumentSearchParam);
    if (shownPreview && !previewDocumentSearchParam) {
      scrollToIndex(previewIndex, "nearest");
    }
  }

  // Changes the filter and starts over at the top. Done in a single
  // update since consecutive setSearchParams calls would overwrite each other.
  const updateFilter = useCallback(
    (update: (params: URLSearchParams) => void) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        update(next);
        clearGalleryPosition(next);
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

  const visibleIds = useMemo(() => {
    const ids: string[] = [];
    for (let index = visibleRange[0]; index <= visibleRange[1]; index++) {
      const document = byIndex.get(index);
      if (document) ids.push(document.id);
    }
    return ids;
  }, [visibleRange, byIndex]);

  const { isSelected, setSelected, toggle } = selection;

  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every(isSelected);

  const onToggleVisible = useCallback(
    () => setSelected(visibleIds, !allVisibleSelected),
    [visibleIds, allVisibleSelected, setSelected],
  );

  const onThumbnailClick = useCallback(
    (id: string) => {
      if (!editMode) {
        setPreviewDocument(id);
      } else {
        toggle(id);
      }
    },
    [editMode, setPreviewDocument, toggle],
  );

  const onSelectDocument = useCallback(
    (id: string, selected: boolean) => setSelected([id], selected),
    [setSelected],
  );

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
          selectedCount={selection.count}
          total={total}
          allSelected={selection.allSelected}
          onSelectAll={selection.selectAll}
          allVisibleSelected={allVisibleSelected}
          onToggleVisible={onToggleVisible}
          onClearSelection={clearSelection}
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
        visibleRange={visibleRange}
      />

      <VirtualThumbnailGrid
        total={loadedTotal}
        byIndex={byIndex}
        byId={byId}
        windowSize={GALLERY_WINDOW_SIZE}
        onVisibleRangeChange={onVisibleRangeChange}
        scrollRequest={scrollRequest}
        onScrollRequestDone={onScrollRequestDone}
        layoutType={layoutType}
        isSelected={isSelected}
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
        selection={selection.request}
        count={selection.count}
        isOpen={editDocumentsModalOpen}
        onAbort={() => setEditDocumentsModalOpen(false)}
        onConfirm={() => {
          setEditDocumentsModalOpen(false);
          clearSelection();
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
