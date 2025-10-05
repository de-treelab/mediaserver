import { enhancedApi } from "../app/enhancedApi";
import { ThumbnailContainer } from "../components/ThumbnailContainer";
import { Pagination } from "../components/Pagination";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { PreviewContainer } from "../sections/PreviewContainer";

export const GalleryPage = () => {
  const { t } = useTranslation();

  const [currentPage, setCurrentPage] = useState(0);
  const limit = useMemo(() => 60, []);
  const offset = useMemo(() => currentPage * limit, [currentPage, limit]);

  const { currentData: data } = enhancedApi.useListDocumentsQuery({
    limit: limit,
    offset: offset,
  });

  const idToDocument = useMemo(
    () => Object.fromEntries((data?.items ?? []).map((d) => [d.id, d])),
    [data],
  );

  const total = useMemo(() => data?.total || 0, [data?.total]);

  const [searchParams, setSearchParams] = useSearchParams();

  const previewDocumentSearchParam = searchParams.get("preview");
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
        setSearchParams((prev) => {
          const newParams = new URLSearchParams(prev);
          newParams.set("preview", previewDocumentId);
          return newParams;
        });
      } else {
        setSearchParams((prev) => {
          const newParams = new URLSearchParams(prev);
          newParams.delete("preview");
          return newParams;
        });
      }
    },
    [setSearchParams],
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
      <Pagination
        total={total}
        limit={limit}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
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
        currentPage={currentPage}
        onPageChange={setCurrentPage}
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
          queryParams={{ limit, offset }}
          onClose={() => setPreviewDocument(undefined)}
        />
      )}
    </>
  );
};
