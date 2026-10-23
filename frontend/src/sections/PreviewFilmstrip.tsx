import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { twMerge } from "tailwind-merge";
import type { Document } from "../app/api";
import type { Filmstrip } from "../hooks/usePreviewNavigation";
import { useThumbnail } from "../hooks/useThumbnail";
import { fileIconFromMimeType } from "../util/fileIconFromFile";

// Thumbnail width plus gap, in px
const SLOT_WIDTH = 72;
// Scroll distance per slot when browsing with the wheel / trackpad
const WHEEL_STEP = 50;
// Pointer movement before a press counts as dragging instead of a click
const DRAG_THRESHOLD = 5;
// Idle time after browsing until the strip returns to the current document
const SNAP_BACK_DELAY = 4000;

type Props = {
  filmstrip: Filmstrip;
  onSelect: (document: Document) => void;
};

/**
 * Strip of the documents around the previewed one, which stays in the
 * center. Can be browsed with the wheel or by dragging without changing the
 * preview.
 */
export const PreviewFilmstrip = ({ filmstrip, onSelect }: Props) => {
  const { t } = useTranslation();
  const { slots, centerIndex, currentIndex, offset, setOffset, setRadius } =
    filmstrip;
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = useState<number | undefined>();
  const dragStart = useRef<{ x: number; pointerId: number } | undefined>(
    undefined,
  );
  const suppressClick = useRef(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setRadius(Math.ceil(entry.contentRect.width / SLOT_WIDTH / 2)),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [setRadius]);

  // Attached natively so we can preventDefault (React's onWheel is passive)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let accumulated = 0;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      accumulated +=
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY;
      const steps = Math.trunc(accumulated / WHEEL_STEP);
      if (steps) {
        accumulated -= steps * WHEEL_STEP;
        setOffset((o) => o + steps);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [setOffset]);

  useEffect(() => {
    if (offset === 0 || hovered || dragOffset !== undefined) return;
    const timeout = setTimeout(() => setOffset(() => 0), SNAP_BACK_DELAY);
    return () => clearTimeout(timeout);
  }, [offset, hovered, dragOffset, setOffset]);

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0) return;
    dragStart.current = { x: event.clientX, pointerId: event.pointerId };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const start = dragStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const dx = event.clientX - start.x;
    if (dragOffset === undefined && Math.abs(dx) < DRAG_THRESHOLD) return;
    // Captured only once dragging, as capturing retargets the click
    containerRef.current?.setPointerCapture(event.pointerId);
    setDragOffset(dx);
  };

  const onPointerUp = () => {
    if (dragOffset !== undefined) {
      const steps = Math.round(-dragOffset / SLOT_WIDTH);
      setOffset((o) => o + steps);
      suppressClick.current = true;
    }
    dragStart.current = undefined;
    setDragOffset(undefined);
  };

  return (
    <div
      ref={containerRef}
      role="listbox"
      aria-label={t("document.preview.filmstrip")}
      className="relative h-full w-full overflow-hidden select-none touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onClickCapture={(event) => {
        if (suppressClick.current) {
          suppressClick.current = false;
          event.stopPropagation();
        }
      }}
    >
      {slots.map(({ index, document }) => {
        const x = (index - centerIndex) * SLOT_WIDTH + (dragOffset ?? 0);
        const current = index === currentIndex;
        return (
          <div
            key={index}
            className={twMerge(
              "absolute left-1/2 top-1/2 -mt-8 -ml-8 w-16 h-16",
              dragOffset === undefined &&
                "transition-transform duration-200 ease-out",
            )}
            style={{ transform: `translateX(${x}px)` }}
          >
            {document ? (
              <FilmstripThumbnail
                document={document}
                current={current}
                onClick={() => onSelect(document)}
              />
            ) : (
              <div className="w-full h-full rounded-md bg-surface-2 animate-pulse" />
            )}
          </div>
        );
      })}
    </div>
  );
};

type ThumbnailProps = {
  document: Document;
  current: boolean;
  onClick: () => void;
};

const FilmstripThumbnail = ({ document, current, onClick }: ThumbnailProps) => {
  const { objectUrl } = useThumbnail(document.id);
  const isImage = document.mime.startsWith("image/");
  const TypeIcon = fileIconFromMimeType(document.mime);

  return (
    <button
      role="option"
      aria-selected={current}
      aria-current={current ? "true" : undefined}
      title={document.friendlyName || undefined}
      onClick={onClick}
      className={twMerge(
        "relative block w-full h-full rounded-md overflow-hidden bg-surface-2 cursor-pointer",
        "transition-[transform,opacity] duration-200",
        "focus-visible:outline-2 focus-visible:outline-accent-subtle",
        current
          ? "scale-110 opacity-100 ring-2 ring-accent"
          : "opacity-50 hover:opacity-100",
      )}
    >
      {objectUrl && (
        <img
          src={objectUrl}
          alt={document.friendlyName}
          draggable={false}
          className="w-full h-full object-cover"
        />
      )}
      {!isImage && (
        <span className="absolute bottom-1 right-1 p-0.5 rounded bg-black/60 text-white">
          <TypeIcon size="0.625rem" />
        </span>
      )}
    </button>
  );
};
