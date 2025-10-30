import { twMerge } from "tailwind-merge";
import { useThumbnail } from "../hooks/useThumbnail";
import type { Document } from "../app/api";

const layouts = {
  grid: "w-[120px] h-[120px] m-2 transition-all duration-200 object-contain border-transparent border-1 hover:border-blue-200",
  list: "flex flex-row w-full basis-full p-2 border-b-gray-700 border-b-1 items-center cursor-pointer hover:bg-gray-600",
};

type Props = {
  document: Document;
  onClick?: () => void;
  className?: string;
  selected?: boolean;
  layout?: keyof typeof layouts;
};

export const Thumbnail = ({
  document,
  onClick,
  className,
  selected,
  layout = "grid",
}: Props) => {
  const { objectUrl, isLoading, error } = useThumbnail(document.id);

  if (isLoading || error) {
    return (
      <div className="w-[120px] h-[120px] bg-gray-300 flex items-center justify-center" />
    );
  }

  return layout === "grid" ? (
    <img
      className={twMerge(
        layouts[layout],
        onClick && "cursor-pointer",
        className,
        selected && "border-blue-200",
      )}
      src={objectUrl}
      alt="Document Thumbnail"
      onClick={onClick}
    />
  ) : (
    <div className={twMerge(layouts[layout], className)} onClick={onClick}>
      <span className="flex-grow">{document.id}</span>
      <span className="basis-1/5">{document.mime} </span>
      <img src={objectUrl} className="w-12 h-12 object-contain" />
    </div>
  );
};
