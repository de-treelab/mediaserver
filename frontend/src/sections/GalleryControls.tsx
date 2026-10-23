import { useTranslation } from "react-i18next";
import { FiGrid, FiList, FiShuffle } from "react-icons/fi";
import { MdBookmarkAdd } from "react-icons/md";
import { twMerge } from "tailwind-merge";

type Props = {
  hasRandomSort: boolean;
  onReseed: () => void;
  hasQuery: boolean;
  onSaveCollection: () => void;
  layoutType: "grid" | "list";
  onSetLayoutType: (type: "grid" | "list") => void;
  sortMode: "newest" | "random";
  onSetSortMode: (mode: "newest" | "random") => void;
  total: number;
  pageSize: number;
};

export const GalleryControls = ({
  hasRandomSort,
  onReseed,
  hasQuery,
  onSaveCollection,
  layoutType,
  onSetLayoutType,
  sortMode,
  onSetSortMode,
  total,
  pageSize,
}: Props) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-row items-center justify-end gap-3 px-3 py-1">
      {hasQuery && (
        <MdBookmarkAdd
          className="text-xl cursor-pointer text-text-muted hover:text-accent-subtle transition-colors"
          title={t("collections.saveAsCollection")}
          onClick={onSaveCollection}
        />
      )}
      <span className="text-sm text-text-muted whitespace-nowrap">
        {pageSize} of {total}
      </span>
      <div className="flex items-center gap-1.5">
        <select
          value={sortMode}
          onChange={(e) => onSetSortMode(e.target.value as "newest" | "random")}
          className="bg-surface-2 border border-border text-text-secondary text-sm rounded-md px-2 py-1 cursor-pointer appearance-none"
        >
          <option value="newest">Newest first</option>
          <option value="random">Random</option>
        </select>
        {hasRandomSort && (
          <FiShuffle
            className="text-lg cursor-pointer text-text-muted hover:text-accent-subtle transition-colors"
            title={t("pages.gallery.reseed")}
            onClick={onReseed}
          />
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <FiGrid
          className={twMerge(
            "text-xl transition-colors",
            layoutType === "grid"
              ? "text-accent-subtle"
              : "cursor-pointer text-text-muted hover:text-text-secondary",
          )}
          onClick={() => onSetLayoutType("grid")}
        />
        <FiList
          className={twMerge(
            "text-xl transition-colors",
            layoutType === "list"
              ? "text-accent-subtle"
              : "cursor-pointer text-text-muted hover:text-text-secondary",
          )}
          onClick={() => onSetLayoutType("list")}
        />
      </div>
    </div>
  );
};
