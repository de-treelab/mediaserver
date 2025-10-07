import { twMerge } from "tailwind-merge";
import type { ApiTag } from "../app/api";

type Props = {
  tags: (ApiTag & { usageCount?: number })[];
  className?: string;
  onClick?: (tag: ApiTag) => void;
  onDelete?: (tag: ApiTag) => void;
};

export const TagList = ({ tags, onClick, onDelete, className }: Props) => {
  return (
    <div
      className={twMerge(
        "flex flex-row flex-wrap items-start gap-2",
        className,
      )}
    >
      {tags.map((tag) => (
        <div
          key={`${tag.key}:${tag.value}`}
          onClick={() => onClick?.(tag)}
          className={twMerge(
            "px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-sm duration-200 h-8 basis-8 flex items-center z-100",
            onClick
              ? "cursor-pointer hover:bg-blue-400 dark:hover:bg-blue-600  "
              : "cursor-default",
          )}
        >
          <span className="text-gray-600 dark:text-gray-300">
            {tag.key}
            {tag.value ? `:${tag.value}` : ""}
          </span>
          {typeof tag.usageCount === "number" && (
            <span className="ml-1 text-gray-400">({tag.usageCount})</span>
          )}
          {onDelete && (
            <span
              className="ml-1 cursor-delete text-gray-400 hover:text-red-500 text-lg"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(tag);
              }}
            >
              &times;
            </span>
          )}
        </div>
      ))}
    </div>
  );
};
