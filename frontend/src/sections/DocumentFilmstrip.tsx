import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { twMerge } from "tailwind-merge";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { enhancedApi } from "../app/enhancedApi";
import type { Document } from "../app/api";
import type { DocumentFilmstripProps } from "../plugins/plugin";
import { useThumbnail } from "../hooks/useThumbnail";
import { fileIconFromMimeType } from "../util/fileIconFromFile";

const DEFAULT_LIMIT = 20;
// Share of the visible width scrolled per arrow click
const SCROLL_PAGE = 0.8;
// Pixels per line for wheel events reporting their delta in lines
const LINE_HEIGHT = 16;
// Share of the remaining distance covered per animation frame
const EASING = 0.18;
// Pointer movement before a press counts as dragging instead of a click
const DRAG_THRESHOLD = 5;
// How far a drag keeps gliding after release, per px/ms of release velocity
const MOMENTUM = 250;

const tileSize = "w-28 h-28 sm:w-40 sm:h-40";

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Eases the horizontal scroll position of `ref` towards a target. Successive
 * calls (e.g. wheel ticks) move the target, so the strip glides continuously.
 */
const useAnimatedScroll = (ref: React.RefObject<HTMLDivElement | null>) => {
  const target = useRef<number | undefined>(undefined);
  const frame = useRef<number | undefined>(undefined);

  const stop = useCallback(() => {
    if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    frame.current = undefined;
    target.current = undefined;
  }, []);

  useEffect(() => stop, [stop]);

  const scrollBy = useCallback(
    (delta: number) => {
      const el = ref.current;
      if (!el) return;
      const max = el.scrollWidth - el.clientWidth;
      const from = target.current ?? el.scrollLeft;
      target.current = Math.min(max, Math.max(0, from + delta));

      if (prefersReducedMotion()) {
        el.scrollLeft = target.current;
        stop();
        return;
      }
      if (frame.current !== undefined) return;

      const step = () => {
        const to = target.current;
        if (to === undefined) return;
        const before = el.scrollLeft;
        const diff = to - before;
        // At least a pixel per frame, as browsers may round scrollLeft
        const move = Math.sign(diff) * Math.max(1, Math.abs(diff) * EASING);
        if (Math.abs(diff) <= 1) {
          el.scrollLeft = to;
          stop();
          return;
        }
        el.scrollLeft = before + move;
        // Blocked (e.g. the content shrank): give up instead of spinning
        if (el.scrollLeft === before) {
          stop();
          return;
        }
        frame.current = requestAnimationFrame(step);
      };
      frame.current = requestAnimationFrame(step);
    },
    [ref, stop],
  );

  return { scrollBy, stop, target };
};

const toGalleryUrl = (search: Record<string, string>) => {
  const params = new URLSearchParams(
    Object.entries(search).filter(([, value]) => value !== ""),
  );
  const query = params.toString();
  return query ? `/gallery?${query}` : "/gallery";
};

export const DocumentFilmstrip = ({
  title,
  query,
  seed,
  limit = DEFAULT_LIMIT,
  hideWhenEmpty = false,
  gallerySearch,
}: DocumentFilmstripProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading, isError } = enhancedApi.useListDocumentsQuery({
    limit,
    query,
    seed,
  });
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState({ left: false, right: false });
  const animated = useAnimatedScroll(scrollerRef);
  const { scrollBy: animateScrollBy } = animated;
  const drag = useRef<
    | {
        pointerId: number;
        startX: number;
        startScroll: number;
        dragging: boolean;
        // Recent pointer positions, for the release velocity
        samples: { x: number; time: number }[];
      }
    | undefined
  >(undefined);
  const suppressClick = useRef(false);
  const [dragging, setDragging] = useState(false);

  const updateCanScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScroll({
      left: el.scrollLeft > 0,
      // Rounding of fractional scroll positions can leave a pixel
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateCanScroll);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateCanScroll, data]);

  // A vertical wheel does not scroll horizontal overflow by itself. Attached
  // natively so we can preventDefault (React's onWheel is passive).
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      // Horizontal gestures (trackpads, shift+wheel) already scroll natively
      if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      const delta =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? event.deltaY * LINE_HEIGHT
          : event.deltaY;
      const position = animated.target.current ?? el.scrollLeft;
      const atStart = position <= 0;
      const atEnd = position + el.clientWidth >= el.scrollWidth - 1;
      // Let the page scroll on once the strip reached its end
      if ((delta < 0 && atStart) || (delta > 0 && atEnd)) return;
      event.preventDefault();
      animateScrollBy(delta);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [data, animated.target, animateScrollBy]);

  // Touch scrolls natively; mouse and pen drag the strip like the preview's
  const onPointerDown = (event: React.PointerEvent) => {
    const el = scrollerRef.current;
    if (!el || event.pointerType === "touch" || event.button !== 0) return;
    animated.stop();
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScroll: el.scrollLeft,
      dragging: false,
      samples: [{ x: event.clientX, time: event.timeStamp }],
    };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const el = scrollerRef.current;
    const state = drag.current;
    if (!el || !state || state.pointerId !== event.pointerId) return;
    const dx = event.clientX - state.startX;
    if (!state.dragging) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      state.dragging = true;
      setDragging(true);
      // Captured only once dragging, as capturing retargets the click
      el.setPointerCapture(event.pointerId);
    }
    el.scrollLeft = state.startScroll - dx;
    state.samples = [
      ...state.samples.filter((s) => event.timeStamp - s.time < 100),
      { x: event.clientX, time: event.timeStamp },
    ];
  };

  const onPointerUp = (event: React.PointerEvent) => {
    const state = drag.current;
    drag.current = undefined;
    if (!state?.dragging) return;
    setDragging(false);
    suppressClick.current = true;
    const first = state.samples[0];
    const elapsed = event.timeStamp - first.time;
    if (elapsed > 0) {
      const velocity = (event.clientX - first.x) / elapsed;
      animateScrollBy(-velocity * MOMENTUM);
    }
  };

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  if (!isLoading && items.length === 0 && hideWhenEmpty) return null;

  const search = gallerySearch ?? { q: query, ...(seed && { seed }) };
  const openDocument = (document: Document) =>
    navigate(toGalleryUrl({ ...search, preview: document.id }));
  const seeAll = () => navigate(toGalleryUrl(search));

  const scrollBy = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (el) animateScrollBy(direction * el.clientWidth * SCROLL_PAGE);
  };

  return (
    <section className="flex flex-col gap-2 min-w-0">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold text-text-primary truncate">
          {title}
        </h2>
        {items.length > 0 && (
          <button
            onClick={seeAll}
            className="shrink-0 text-sm text-text-muted hover:text-text-primary cursor-pointer"
          >
            {t("home.seeAll", { count: total })}
          </button>
        )}
      </div>

      <div className="relative group">
        <div
          ref={scrollerRef}
          onScroll={updateCanScroll}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClickCapture={(event) => {
            if (suppressClick.current) {
              suppressClick.current = false;
              event.stopPropagation();
            }
          }}
          className={twMerge(
            "flex flex-row gap-2 sm:gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-2 [scrollbar-width:thin] select-none",
            dragging && "cursor-grabbing [&_button]:cursor-grabbing",
          )}
        >
          {isLoading &&
            Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                className={twMerge(
                  tileSize,
                  "shrink-0 rounded-md bg-surface-2 animate-pulse",
                )}
              />
            ))}
          {!isLoading && items.length === 0 && (
            <p className="text-sm text-text-muted py-4">
              {t(isError ? "home.loadFailed" : "home.empty")}
            </p>
          )}
          {items.map((document) => (
            <FilmstripTile
              key={document.id}
              document={document}
              onClick={() => openDocument(document)}
            />
          ))}
          {total > items.length && (
            <button
              onClick={seeAll}
              className={twMerge(
                tileSize,
                "shrink-0 rounded-md border border-border text-sm text-text-muted",
                "hover:border-border-strong hover:text-text-primary cursor-pointer",
              )}
            >
              {t("home.more", { count: total - items.length })}
            </button>
          )}
        </div>

        {canScroll.left && (
          <ScrollButton direction="left" onClick={() => scrollBy(-1)} />
        )}
        {canScroll.right && (
          <ScrollButton direction="right" onClick={() => scrollBy(1)} />
        )}
      </div>
    </section>
  );
};

const ScrollButton = ({
  direction,
  onClick,
}: {
  direction: "left" | "right";
  onClick: () => void;
}) => {
  const { t } = useTranslation();
  const Chevron = direction === "left" ? FaChevronLeft : FaChevronRight;
  return (
    <button
      onClick={onClick}
      aria-label={t(
        direction === "left" ? "home.scrollLeft" : "home.scrollRight",
      )}
      className={twMerge(
        "hidden sm:flex absolute top-1/2 -translate-y-1/2 -mt-1 w-9 h-9 items-center justify-center",
        "rounded-full bg-surface-1/90 border border-border text-text-secondary shadow",
        "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity",
        "hover:text-text-primary cursor-pointer",
        direction === "left" ? "left-1" : "right-1",
      )}
    >
      <Chevron />
    </button>
  );
};

const FilmstripTile = ({
  document,
  onClick,
}: {
  document: Document;
  onClick: () => void;
}) => {
  const { objectUrl } = useThumbnail(document.id);
  const [loaded, setLoaded] = useState(false);
  const isImage = document.mime.startsWith("image/");
  const TypeIcon = fileIconFromMimeType(document.mime);

  return (
    <button
      onClick={onClick}
      title={document.friendlyName || undefined}
      className={twMerge(
        tileSize,
        "relative shrink-0 rounded-md overflow-hidden bg-surface-2 cursor-pointer",
        "border border-transparent hover:border-accent-muted transition-colors",
        "focus-visible:outline-2 focus-visible:outline-accent-subtle",
      )}
    >
      {objectUrl && (
        <img
          src={objectUrl}
          alt={document.friendlyName}
          draggable={false}
          onLoad={() => setLoaded(true)}
          className={twMerge(
            "w-full h-full object-cover transition-opacity duration-300 motion-reduce:transition-none",
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
      )}
      {!isImage && (
        <span className="absolute bottom-1 right-1 p-1 rounded bg-black/60 text-white">
          <TypeIcon size="0.75rem" />
        </span>
      )}
    </button>
  );
};
