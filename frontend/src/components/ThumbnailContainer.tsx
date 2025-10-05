import { Thumbnail } from "../sections/Thumbnail";

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
  ids: string[];
  onClick?: (id: string) => void;
  alignment?: keyof typeof alignments;
  direction?: keyof typeof directions;
  wrap?: keyof typeof flexWrap;
  selected?: string;
};

export const ThumbnailContainer = ({
  ids,
  onClick,
  alignment = "start",
  direction = "row",
  wrap = "wrap",
  selected,
}: Props) => {
  return (
    <div
      className={`flex ${directions[direction]} ${flexWrap[wrap]} gap-2 ${alignments[alignment]} min-w-full`}
    >
      {ids.map((id, idx) => (
        <Thumbnail
          className="flex"
          key={idx}
          id={id}
          onClick={() => onClick?.(id)}
          selected={selected === id}
        />
      ))}
    </div>
  );
};
