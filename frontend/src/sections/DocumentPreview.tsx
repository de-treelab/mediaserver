import { useCallback, useMemo, useRef, useState } from "react";
import { DocumentRender } from "../components/DocumentRender";
import { IndeterminateProgressBar } from "../components/IndeterminateProgressBar";
import { useSwipeable } from "react-swipeable";
import { useTranslation } from "react-i18next";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { twMerge } from "tailwind-merge";

type Props = {
  id: string;
  mimeType?: string;
  nextPreviewImage: () => void;
  previousPreviewImage: () => void;
  hasNext: boolean;
  hasPrevious: boolean;
};

export const DocumentPreview = ({
  id,
  mimeType,
  nextPreviewImage,
  previousPreviewImage,
  hasNext,
  hasPrevious,
}: Props) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isZoomed, setIsZoomed] = useState(false);
  const loadingIdRef = useRef(id);

  const handleLoadingChange = useCallback(
    (loading: boolean, documentId: string) => {
      if (documentId === loadingIdRef.current) {
        setIsLoading(loading);
      }
    },
    [],
  );

  if (id !== loadingIdRef.current) {
    loadingIdRef.current = id;
    setIsLoading(true);
    setIsZoomed(false);
  }

  const swipeHandlers = useMemo(
    () =>
      isZoomed
        ? {}
        : {
            onSwipedLeft: nextPreviewImage,
            onSwipedRight: previousPreviewImage,
          },
    [isZoomed, nextPreviewImage, previousPreviewImage],
  );

  const handlers = useSwipeable({
    ...swipeHandlers,
    trackMouse: true,
    preventScrollOnSwipe: true,
    trackTouch: true,
  });

  return (
    <div className="w-full h-full relative" {...handlers}>
      <IndeterminateProgressBar
        isLoading={isLoading}
        className="absolute top-0 left-0 right-0 z-10"
      />
      <div className={isLoading ? "w-full h-full invisible" : "w-full h-full"}>
        <DocumentRender
          documentId={id}
          mimeType={mimeType}
          onLoadingChange={handleLoadingChange}
          onZoomedChange={setIsZoomed}
        />
      </div>
      {/* Panning a zoomed image takes precedence over navigating */}
      {!isZoomed && hasPrevious && (
        <EdgeNavigation side="left" onClick={previousPreviewImage} />
      )}
      {!isZoomed && hasNext && (
        <EdgeNavigation side="right" onClick={nextPreviewImage} />
      )}
    </div>
  );
};

type EdgeNavigationProps = {
  side: "left" | "right";
  onClick: () => void;
};

// Click target along the left / right edge, revealed on hover. Covers only
// the middle half of the height to leave toolbars of embedded players
// (e.g. video controls) usable. Touch devices navigate by swiping instead.
const EdgeNavigation = ({ side, onClick }: EdgeNavigationProps) => {
  const { t } = useTranslation();
  const Icon = side === "left" ? FaChevronLeft : FaChevronRight;
  const label = t(
    side === "left" ? "document.preview.previous" : "document.preview.next",
  );

  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={twMerge(
        "group absolute top-1/4 bottom-1/4 z-10 w-[12%] max-w-32 hidden md:flex items-center cursor-pointer",
        side === "left"
          ? "left-0 justify-start pl-4"
          : "right-0 justify-end pr-4",
      )}
    >
      <span className="p-3 rounded-full bg-black/50 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
        <Icon size="1.25rem" />
      </span>
    </button>
  );
};
