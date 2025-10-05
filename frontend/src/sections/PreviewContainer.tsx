import type { SkipToken } from "@reduxjs/toolkit/query";
import { enhancedApi } from "../app/enhancedApi";
import { ThumbnailContainer } from "../components/ThumbnailContainer";
import { DocumentPreview } from "./DocumentPreview";
import { useEffect } from "react";

type Props = {
  previewImageId: string;
  previewImageIndex: number;
  queryParams: Omit<
    Parameters<typeof enhancedApi.useListDocumentsQuery>[0],
    SkipToken
  >;
  totalDocuments: number;
  onThumbnailClicked: (id: string) => void;
  nextPreviewImage: () => void;
  previousPreviewImage: () => void;
  onClose?: () => void;
};

export const PreviewContainer = ({
  previewImageId,
  previewImageIndex,
  totalDocuments,
  queryParams,
  onThumbnailClicked,
  nextPreviewImage,
  previousPreviewImage,
  onClose,
}: Props) => {
  const { data } = enhancedApi.useListDocumentsQuery({
    ...queryParams,
    limit: 5,
    offset: Math.min(Math.max(previewImageIndex - 2, 0), totalDocuments - 5),
  });

  useEffect(() => {
    const keyDownHandler = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        nextPreviewImage();
      } else if (event.key === "ArrowLeft") {
        previousPreviewImage();
      } else if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", keyDownHandler);
    return () => {
      window.removeEventListener("keydown", keyDownHandler);
    };
  }, [nextPreviewImage, previousPreviewImage, onClose]);

  return (
    <>
      <div className="fixed top-0 right-0 w-[calc(100%-4.25rem)] h-[calc(100%-120px-1rem)] bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
        <DocumentPreview id={previewImageId} />
      </div>
      <div className="fixed flex flex-row flex-wrap bottom-0 right-0 w-[calc(100%-4.25rem)] h-[calc(120px+1rem)] z-100 p-2 bg-gray-800 overflow-y-hidden">
        <ThumbnailContainer
          alignment="center"
          ids={data?.items.map((doc) => doc.id) || []}
          onClick={(id) => {
            onThumbnailClicked(id);
          }}
          wrap="nowrap"
          selected={previewImageId}
        />
      </div>
    </>
  );
};
