import { twMerge } from "tailwind-merge";
import { useThumbnail } from "../hooks/useThumbnail";

type Props = {
  id: string;
  onClick?: () => void;
  className?: string;
  selected?: boolean;
};

export const Thumbnail = ({ id, onClick, className, selected }: Props) => {
  const { objectUrl, isLoading, error } = useThumbnail(id);

  if (isLoading || error) {
    return (
      <div className="w-[120px] h-[120px] bg-gray-300 flex items-center justify-center" />
    );
  }

  return (
    <img
      className={twMerge(
        "w-[120px] h-[120px] transition-all duration-200 object-contain border-transparent border-1 hover:border-blue-200",
        onClick && "cursor-pointer",
        className,
        selected && "border-blue-200",
      )}
      src={objectUrl}
      alt="Document Thumbnail"
      onClick={onClick}
    />
  );
};
