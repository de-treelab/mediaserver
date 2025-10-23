import type React from "react";
import { useState } from "react";
import { FaCaretLeft, FaCaretRight, FaDownload } from "react-icons/fa";
import { twMerge } from "tailwind-merge";

type Props = {
  nextDocument: () => void;
  previousDocument: () => void;
  downloadDocument: () => void;
};

export const DocumentPreviewControls: React.FC<Props> = ({
  nextDocument,
  previousDocument,
  downloadDocument,
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={twMerge(
        "absolute bg-gray-700 bottom-4 w-1/3 h-16 rounded-lg outline-offset-2 ",
        "outline-gray-600 outline-2 duration-200 transition-all",
        "flex flex-row justify-around items-center",
        hovered ? "opacity-80" : "opacity-0",
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="hover:bg-gray-600 rounded-md p-2 cursor-pointer"
        onClick={() => {
          previousDocument();
        }}
      >
        <FaCaretLeft size="2rem" />
      </div>
      <div
        className="hover:bg-gray-600 rounded-md p-3 cursor-pointer"
        onClick={() => {
          downloadDocument();
        }}
      >
        <FaDownload size="1.5rem" />
      </div>
      <div
        className="hover:bg-gray-600 rounded-md p-2 cursor-pointer"
        onClick={() => {
          nextDocument();
        }}
      >
        <FaCaretRight size="2rem" />
      </div>
    </div>
  );
};
