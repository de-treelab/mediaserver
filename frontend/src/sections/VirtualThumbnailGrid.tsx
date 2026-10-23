import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { twMerge } from "tailwind-merge";
import type { ApiTag, Document } from "../app/api";
import { pageGutter } from "../components/styles";
import { useDocumentTags } from "../hooks/useDocumentTags";
import type { ScrollRequest } from "../hooks/useGalleryPosition";
import { DocumentCard, DocumentCardPlaceholder } from "./DocumentCard";
import { Thumbnail } from "./Thumbnail";

// Rows rendered beyond the visible ones, so fast scrolling shows no gaps
const OVERSCAN_ROWS = 2;
// Row heights until the first rows are measured
const ESTIMATED_ROW_HEIGHT = { grid: 280, list: 64 };
const ROW_GAP = { grid: 16, list: 0 };

// Same breakpoints as Tailwind's sm / lg / xl
const columnsFor = (width: number) =>
  width >= 1280 ? 6 : width >= 1024 ? 5 : width >= 640 ? 4 : 2;

const subscribeToResize = (callback: () => void) => {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
};

const useGridColumns = () =>
  useSyncExternalStore(subscribeToResize, () => columnsFor(window.innerWidth));

// First visible document and the layout it was seen in
type Anchor = {
  id: string | undefined;
  index: number;
  columns: number;
  rowHeight: number;
};

type Props = {
  total: number | undefined;
  byIndex: Map<number, Document>;
  byId: Map<string, Document>;
  // Documents are fetched in windows of this size; tags are fetched per window
  windowSize: number;
  layoutType: "grid" | "list";
  isSelected?: (id: string) => boolean;
  onThumbnailClick: (id: string) => void;
  onSelect?: (id: string, selected: boolean) => void;
  popularTags?: ApiTag[];
  // Inclusive range of query indices in view
  onVisibleRangeChange: (range: [number, number]) => void;
  scrollRequest: ScrollRequest | undefined;
  onScrollRequestDone: () => void;
};

/**
 * Thumbnails of an entire listing in one scrollable area. Only the rows in
 * view are rendered; documents that aren't loaded yet show as placeholders.
 * All rows are equally tall, so any position can be scrolled to directly.
 */
export const VirtualThumbnailGrid = ({
  total,
  byIndex,
  byId,
  windowSize,
  layoutType,
  isSelected,
  onThumbnailClick,
  onSelect,
  popularTags,
  onVisibleRangeChange,
  scrollRequest,
  onScrollRequestDone,
}: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<Anchor>(undefined);

  const gridColumns = useGridColumns();
  const columns = layoutType === "grid" ? gridColumns : 1;
  const gap = ROW_GAP[layoutType];

  const [measuredRowHeight, setMeasuredRowHeight] = useState<number>();
  // Rows of the other layout are differently tall, measure again
  const [measuredLayout, setMeasuredLayout] = useState(layoutType);
  if (measuredLayout !== layoutType) {
    setMeasuredLayout(layoutType);
    setMeasuredRowHeight(undefined);
  }
  const rowHeight = measuredRowHeight ?? ESTIMATED_ROW_HEIGHT[layoutType];
  const [viewport, setViewport] = useState({ scrollTop: 0, height: 0 });

  const rowCount = total ? Math.ceil(total / columns) : 0;
  const firstRow = Math.max(
    0,
    Math.min(Math.floor(viewport.scrollTop / rowHeight), rowCount - 1),
  );
  const lastRow = Math.min(
    Math.floor((viewport.scrollTop + viewport.height) / rowHeight),
    rowCount - 1,
  );
  const firstRenderedRow = Math.max(0, firstRow - OVERSCAN_ROWS);
  const lastRenderedRow = Math.min(rowCount - 1, lastRow + OVERSCAN_ROWS);
  const renderedRows = Math.max(0, lastRenderedRow - firstRenderedRow + 1);

  const firstVisible = firstRow * columns;
  const lastVisible = Math.min(total ?? 0, (lastRow + 1) * columns) - 1;
  useEffect(() => {
    onVisibleRangeChange([firstVisible, lastVisible]);
  }, [firstVisible, lastVisible, onVisibleRangeChange]);

  // Latest values for the scroll handler
  const layoutRef = useRef({ columns, rowHeight, byIndex, total });
  useLayoutEffect(() => {
    layoutRef.current = { columns, rowHeight, byIndex, total };
  });

  const onScroll = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    const scrollTop = element.scrollTop - (spacerRef.current?.offsetTop ?? 0);
    const height = element.clientHeight;
    setViewport((prev) =>
      prev.scrollTop === scrollTop && prev.height === height
        ? prev
        : { scrollTop, height },
    );
    const { columns, rowHeight, byIndex, total } = layoutRef.current;
    if (!total) return;
    const index = Math.min(
      Math.max(0, Math.floor(scrollTop / rowHeight) * columns),
      total - 1,
    );
    anchorRef.current = {
      id: byIndex.get(index)?.id,
      index,
      columns,
      rowHeight,
    };
  }, []);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    onScroll();
    const observer = new ResizeObserver(onScroll);
    observer.observe(element);
    return () => observer.disconnect();
  }, [onScroll]);

  // Row height of the rendered block, gaps included
  const hasRows = renderedRows > 0;
  useLayoutEffect(() => {
    const block = blockRef.current;
    if (!block) return;
    const measure = () => {
      const rows = Number(block.dataset.rows);
      if (!rows) return;
      const height = (block.getBoundingClientRect().height + gap) / rows;
      setMeasuredRowHeight((prev) =>
        prev !== undefined && Math.abs(prev - height) < 0.01 ? prev : height,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(block);
    return () => observer.disconnect();
  }, [hasRows, gap, columns]);

  // Keeps the first visible document in place when the layout changes or
  // documents are added / removed before it
  useLayoutEffect(() => {
    const element = scrollRef.current;
    const anchor = anchorRef.current;
    if (total === undefined) {
      // A different listing, nothing to keep in place
      anchorRef.current = undefined;
      return;
    }
    if (!element || !anchor) return;
    const id = anchor.id ?? byIndex.get(anchor.index)?.id;
    const index =
      (id !== undefined ? byId.get(id)?.queryIndex : undefined) ?? anchor.index;
    if (
      index === anchor.index &&
      columns === anchor.columns &&
      rowHeight === anchor.rowHeight
    ) {
      anchorRef.current = { ...anchor, id };
      return;
    }
    const offset = spacerRef.current?.offsetTop ?? 0;
    const anchorTop =
      Math.floor(anchor.index / anchor.columns) * anchor.rowHeight;
    const withinRow =
      ((element.scrollTop - offset - anchorTop) / anchor.rowHeight) * rowHeight;
    anchorRef.current = { id, index, columns, rowHeight };
    element.scrollTop =
      Math.floor(index / columns) * rowHeight + withinRow + offset;
    onScroll();
  }, [byIndex, byId, total, columns, rowHeight, onScroll]);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!scrollRequest || !element || total === undefined) return;
    if (total > 0) {
      // Rows have to be measured before positions are known
      if (measuredRowHeight === undefined) return;
      const offset = spacerRef.current?.offsetTop ?? 0;
      const index = Math.min(scrollRequest.index, total - 1);
      const top = Math.floor(index / columns) * measuredRowHeight + offset;
      const bottom = top + measuredRowHeight - gap;
      if (scrollRequest.align === "start" || top < element.scrollTop) {
        element.scrollTop = top;
      } else if (bottom > element.scrollTop + element.clientHeight) {
        element.scrollTop = bottom - element.clientHeight;
      }
    }
    onScroll();
    onScrollRequestDone();
  }, [
    scrollRequest,
    total,
    measuredRowHeight,
    columns,
    gap,
    onScroll,
    onScrollRequestDone,
  ]);

  // Tags of all windows in view that are entirely loaded
  const tagGroups = useMemo(() => {
    if (layoutType !== "grid" || !total || !hasRows) return [];
    const from = firstRenderedRow * columns;
    const to = Math.min(total, (lastRenderedRow + 1) * columns) - 1;
    const groups: string[][] = [];
    for (let start = from - (from % windowSize); start <= to; ) {
      const end = Math.min(total, start + windowSize);
      const ids: string[] = [];
      for (let index = start; index < end; index++) {
        const id = byIndex.get(index)?.id;
        if (!id) break;
        ids.push(id);
      }
      if (ids.length === end - start) groups.push(ids);
      start = end;
    }
    return groups;
  }, [
    layoutType,
    total,
    hasRows,
    firstRenderedRow,
    lastRenderedRow,
    columns,
    windowSize,
    byIndex,
  ]);
  const tagsMap = useDocumentTags(tagGroups);

  const popularTagKeys = useMemo(() => {
    if (!popularTags) return new Set<string>();
    return new Set(
      popularTags.map((t) => (t.value ? `${t.key}:${t.value}` : t.key)),
    );
  }, [popularTags]);

  const slots = [];
  if (total) {
    const to = Math.min(total, (lastRenderedRow + 1) * columns);
    for (let index = firstRenderedRow * columns; index < to; index++) {
      const document = byIndex.get(index);
      if (!document) {
        slots.push(
          layoutType === "grid" ? (
            <DocumentCardPlaceholder key={`slot-${index}`} />
          ) : (
            <div
              key={`slot-${index}`}
              className="h-16 border-b border-b-border"
            />
          ),
        );
        continue;
      }
      const select = onSelect
        ? (selected: boolean) => onSelect(document.id, selected)
        : undefined;
      if (layoutType === "grid") {
        slots.push(
          <DocumentCard
            key={document.id}
            document={document}
            tags={tagsMap[document.id]}
            popularTagKeys={popularTagKeys}
            onClick={() => onThumbnailClick(document.id)}
            selected={isSelected?.(document.id)}
            onSelect={select}
          />,
        );
      } else {
        slots.push(
          <Thumbnail
            key={document.id}
            document={document}
            layout="list"
            onClick={() => onThumbnailClick(document.id)}
            selected={isSelected?.(document.id)}
            onSelect={select}
          />,
        );
      }
    }
  }

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      // Positioned, so the spacer's offsetTop is relative to it. Anchoring is
      // done above, the browser's own would interfere with it.
      className={twMerge(
        pageGutter,
        "relative py-1 max-w-full flex-grow overflow-auto [overflow-anchor:none]",
      )}
    >
      <div
        ref={spacerRef}
        className="relative"
        style={{ height: rowCount * rowHeight - (rowCount > 0 ? gap : 0) }}
      >
        {hasRows && (
          <div
            ref={blockRef}
            data-rows={renderedRows}
            className="absolute inset-x-0 top-0 grid"
            style={{
              transform: `translateY(${firstRenderedRow * rowHeight}px)`,
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              gap,
            }}
          >
            {slots}
          </div>
        )}
      </div>
    </div>
  );
};
