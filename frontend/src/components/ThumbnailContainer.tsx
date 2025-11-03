import { Thumbnail } from "../sections/Thumbnail";
import { type Document } from "../app/api";
import { twMerge } from "tailwind-merge";

const alignments = {
  center: "justify-center",
  start: "justify-start",
};

const directions = {
  row: "flex-row",
  column: "flex-col",
};

const flexWrap = {
  wrap: "flex-wrap",
  nowrap: "flex-nowrap",
};

type Props = {
  thumbnails: Document[];
  onClick?: (id: string) => void;
  alignment?: keyof typeof alignments;
  direction?: keyof typeof directions;
  wrap?: keyof typeof flexWrap;
  layout?: React.ComponentProps<typeof Thumbnail>["layout"];
  selected?: string;
  className?: string;
  size?: "normal" | "small";
};

export const ThumbnailContainer = ({
  thumbnails,
  onClick,
  alignment = "start",
  direction = "row",
  wrap = "wrap",
  layout = "grid",
  size = "normal",
  selected,
  className,
}: Props) => {
  return (
    <div
      className={twMerge(
        `flex ${directions[direction]} ${flexWrap[wrap]} ${alignments[alignment]}`,
        className,
      )}
    >
      {thumbnails.map((thumbnail, idx) => (
        <Thumbnail
          key={idx}
          document={thumbnail}
          onClick={() => onClick?.(thumbnail.id)}
          selected={selected === thumbnail.id}
          layout={layout}
          size={size}
        />
      ))}
    </div>
  );
};
