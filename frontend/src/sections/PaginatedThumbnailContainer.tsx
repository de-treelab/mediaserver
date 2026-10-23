import { useTranslation } from "react-i18next";
import { type Document, type ApiTag, END_CURSOR } from "../app/api";
import { CursorPagination } from "../components/CursorPagination";
import type { PagePosition } from "../hooks/useCursorPageParams";
import { ThumbnailContainer } from "../components/ThumbnailContainer";
import { enhancedApi } from "../app/enhancedApi";
import { useMemo } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { twMerge } from "tailwind-merge";
import { pageGutter } from "../components/styles";

type Props = {
  items: Document[];
  total: number;
  startIndex: number;
  prevCursor: string | undefined;
  nextCursor: string | undefined;
  onPositionChange: (position: PagePosition) => void;
  layoutType: "grid" | "list";
  selectedDocuments?: Set<string>;
  onThumbnailClick: (id: string) => void;
  onSelect?: (id: string, selected: boolean) => void;
  popularTags?: ApiTag[];
};

export const PaginatedThumbnailContainer = ({
  items,
  total,
  startIndex,
  prevCursor,
  nextCursor,
  onPositionChange,
  layoutType,
  selectedDocuments,
  onThumbnailClick,
  onSelect,
  popularTags,
}: Props) => {
  const { t } = useTranslation();

  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  const { data: itemsWithTags } = enhancedApi.useListDocumentsByIdsQuery(
    layoutType === "grid" && itemIds.length > 0 ? itemIds : skipToken,
  );

  const tagsMap = useMemo(() => {
    if (!itemsWithTags) return {};
    return Object.fromEntries(itemsWithTags.map((d) => [d.id, d.tags]));
  }, [itemsWithTags]);

  const popularTagKeys = useMemo(() => {
    if (!popularTags) return new Set<string>();
    return new Set(
      popularTags.map((t) => (t.value ? `${t.key}:${t.value}` : t.key)),
    );
  }, [popularTags]);

  return (
    <>
      <div
        className={twMerge(
          pageGutter,
          "py-1 max-w-full flex-grow overflow-auto",
        )}
      >
        <ThumbnailContainer
          alignment="start"
          thumbnails={items}
          onClick={onThumbnailClick}
          layout={layoutType}
          onSelect={onSelect}
          selectedDocuments={selectedDocuments}
          tagsMap={tagsMap}
          popularTagKeys={popularTagKeys}
        />
      </div>
      <div
        className={twMerge(
          pageGutter,
          "flex items-center justify-between py-3 border-t border-border shrink-0",
        )}
      >
        <span className="text-sm text-text-muted">
          {t("pagination.range", {
            start: items.length > 0 ? startIndex + 1 : 0,
            end: startIndex + items.length,
            total,
          })}
        </span>
        <CursorPagination
          hasPrevious={!!prevCursor}
          hasNext={!!nextCursor}
          onFirst={() => onPositionChange({})}
          onPrevious={() => onPositionChange({ before: prevCursor })}
          onNext={() => onPositionChange({ after: nextCursor })}
          onLast={() => onPositionChange({ before: END_CURSOR })}
        />
      </div>
    </>
  );
};
