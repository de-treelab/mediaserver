import { useCallback, useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

type DropdownItem<T> = {
  value: T;
  key: string;
  node: React.ReactNode;
};

type Props<T> = {
  values: DropdownItem<T>[];
  className?: string;
  direction?: "up" | "down";
  onClick?: (value: T) => void;
};

export const Dropdown = <T,>({
  values,
  onClick,
  className,
  direction = "down",
}: Props<T>) => {
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        setHighlightedIndex((prev) => Math.min(prev + 1, values.length - 1));
      } else if (event.key === "ArrowUp") {
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
      } else if (event.key === "Enter" && highlightedIndex >= 0) {
        event.preventDefault();
        event.stopPropagation();

        const item = values[highlightedIndex];
        if (item) {
          onClick?.(item.value);
        }
      }
    },
    [highlightedIndex, onClick, values],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <div
      className={twMerge(
        "absolute bg-white -mt-2 border-b border-gray-300 max-h-60 overflow-y-auto w-full z-10 text-black",
        direction === "up"
          ? "bottom-full rounded-t-md"
          : "top-full rounded-b-md",
        className,
      )}
    >
      {values.map(({ value, node, key }, index) => (
        <div
          key={key}
          className={twMerge(
            "px-2 py-1 hover:bg-gray-200 cursor-pointer",
            index === highlightedIndex ? "bg-gray-200" : "",
          )}
          onClick={() => onClick?.(value)}
        >
          {node}
        </div>
      ))}
    </div>
  );
};
