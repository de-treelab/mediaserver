import { useTranslation } from "react-i18next";
import { FiGrid, FiList, FiShuffle } from "react-icons/fi";
import { MdBookmarkAdd } from "react-icons/md";
import { twMerge } from "tailwind-merge";
import { pageGutter } from "../components/styles";
import { Select } from "../components/Input";

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
  // Inclusive range of query indices in view
  visibleRange: [number, number];
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
  visibleRange: [first, last],
}: Props) => {
  const { t } = useTranslation();

  return (
    <div
      className={twMerge(
        pageGutter,
        "flex flex-row items-center justify-end gap-3",
      )}
    >
      {hasQuery && (
        <MdBookmarkAdd
          className="text-xl cursor-pointer text-text-muted hover:text-accent-subtle transition-colors"
          title={t("collections.saveAsCollection")}
          onClick={onSaveCollection}
        />
      )}
      <span className="text-sm text-text-muted whitespace-nowrap">
        {t("pages.gallery.visibleRange", {
          start: last >= first ? first + 1 : 0,
          end: last + 1,
          total,
        })}
      </span>
      <div className="flex items-center gap-1.5">
        <Select
          inputSize="sm"
          value={sortMode}
          onChange={(e) => onSetSortMode(e.target.value as "newest" | "random")}
          className="text-sm text-text-secondary appearance-none"
        >
          <option value="newest">{t("pages.gallery.sortNewest")}</option>
          <option value="random">{t("pages.gallery.sortRandom")}</option>
        </Select>
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
