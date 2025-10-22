import { enhancedApi } from "../app/enhancedApi";
import { ThumbnailContainer } from "../components/ThumbnailContainer";
import { Pagination } from "../components/Pagination";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { PreviewContainer } from "../sections/PreviewContainer";
import { useEasySearchParams } from "../hooks/useEasySearchParams";
import { usePageOffsetAndLimitParams } from "../hooks/usePageOffsetAndLimitParams";
import { TagInput } from "../sections/TagInput";

export const GalleryPage = () => {
  const { t } = useTranslation();

  const { limit, offset, page, setPage } = usePageOffsetAndLimitParams();

  const {
    params: { preview: previewDocumentSearchParam, q: query },
    addSearchParam,
    removeSearchParam,
  } = useEasySearchParams(["preview", "q"]);

  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    setTagInput((prev) => query || prev);
  }, [query]);

  const { currentData: data } = enhancedApi.useListDocumentsQuery({
    limit: limit,
    offset: offset,
    query: query,
  });

  const idToDocument = useMemo(
    () => Object.fromEntries((data?.items ?? []).map((d) => [d.id, d])),
    [data],
  );

  const total = useMemo(() => data?.total || 0, [data?.total]);

  const previewDocument = useMemo(
    () =>
      previewDocumentSearchParam
        ? idToDocument[previewDocumentSearchParam]
        : undefined,
    [idToDocument, previewDocumentSearchParam],
  );

  const setPreviewDocument = useCallback(
    (previewDocumentId: string | undefined) => {
      if (previewDocumentId) {
        addSearchParam("preview", previewDocumentId);
      } else {
        removeSearchParam("preview");
      }
    },
    [addSearchParam, removeSearchParam],
  );

  const nextPreviewImage = useCallback(() => {
    if (previewDocument?.nextId) {
      setPreviewDocument(previewDocument.nextId);
    }
  }, [setPreviewDocument, previewDocument]);

  const prevPreviewImage = useCallback(() => {
    if (previewDocument?.previousId) {
      setPreviewDocument(previewDocument.previousId);
    }
  }, [setPreviewDocument, previewDocument]);

  return (
    <>
      <TagInput
        value={tagInput}
        onChange={setTagInput}
        onValidChange={() => {}}
        onSubmit={(value) => addSearchParam("q", value)}
        className="mb-2"
        blurOnSubmit
      />
      <Pagination
        total={total}
        limit={limit}
        currentPage={page}
        onPageChange={setPage}
      />
      <ThumbnailContainer
        ids={data?.items.map((doc) => doc.id) || []}
        onClick={(id) => {
          setPreviewDocument(id);
        }}
      />
      <span>
        {t("pagination.range", {
          start: offset + 1,
          end: Math.min(offset + limit, total),
          total: total,
        })}
      </span>
      <Pagination
        total={total}
        limit={limit}
        currentPage={page}
        onPageChange={setPage}
      />
      {previewDocument && (
        <PreviewContainer
          totalDocuments={total}
          previewImageId={previewDocument.id}
          onThumbnailClicked={(id) => {
            setPreviewDocument(id);
          }}
          nextPreviewImage={nextPreviewImage}
          previousPreviewImage={prevPreviewImage}
          previewImageIndex={previewDocument.queryIndex}
          queryParams={{ limit, offset, query }}
          onClose={() => setPreviewDocument(undefined)}
        />
      )}
    </>
  );
};
