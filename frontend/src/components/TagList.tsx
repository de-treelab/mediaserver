import { twMerge } from "tailwind-merge";
import type { ApiTag } from "../app/api";

type Props = {
  tags: (ApiTag & { usageCount?: number })[];
  onClick?: (tag: ApiTag) => void;
};

export const TagList = ({ tags, onClick }: Props) => {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <div
          key={`${tag.key}:${tag.value}`}
          onClick={() => onClick?.(tag)}
          className={twMerge(
            "px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-sm duration-200 flex items-center z-100",
            onClick
              ? "cursor-pointer hover:bg-red-400 dark:hover:bg-red-600  "
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
        </div>
      ))}
    </div>
  );
};
