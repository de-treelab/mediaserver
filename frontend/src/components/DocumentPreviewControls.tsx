import type React from "react";
import { useState } from "react";
import { FaCaretLeft, FaCaretRight, FaDownload } from "react-icons/fa";
import { LuPresentation } from "react-icons/lu";
import { twMerge } from "tailwind-merge";
import { useIsMobileScreen } from "../hooks/useIsMobileScreen";

type Props = {
  nextDocument: () => void;
  previousDocument: () => void;
  downloadDocument: () => void;
  toggleDiashow: () => void;
};

export const DocumentPreviewControls: React.FC<Props> = ({
  nextDocument,
  previousDocument,
  downloadDocument,
  toggleDiashow,
}) => {
  const [hovered, setHovered] = useState(false);

  const isMobile = useIsMobileScreen();

  const normalControlSize = isMobile ? "1.25rem" : "2rem";
  const smallControlSize = isMobile ? "1rem" : "1.5rem";

  return (
    <div
      className={twMerge(
        "absolute bg-gray-700 bottom-0 right-0.25 w-2/5 sm:right-[initial] sm:bottom-4 sm:w-1/3 sm:h-16 rounded-tl-lg sm:rounded-lg outline-offset-2 z-60",
        "sm:outline-gray-600 sm:outline-2 duration-200 transition-all",
        "flex flex-row justify-around items-center",
        hovered ? "sm:opacity-80" : "sm:opacity-0",
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
        <FaCaretLeft size={normalControlSize} />
      </div>
      <div
        className="hover:bg-gray-600 rounded-md p-3 cursor-pointer"
        onClick={() => {
          downloadDocument();
        }}
      >
        <FaDownload size={smallControlSize} />
      </div>
      <div
        className="hover:bg-gray-600 rounded-md p-2 cursor-pointer"
        onClick={() => {
          toggleDiashow();
        }}
      >
        <LuPresentation size={smallControlSize} />
      </div>
      <div
        className="hover:bg-gray-600 rounded-md p-2 cursor-pointer"
        onClick={() => {
          nextDocument();
        }}
      >
        <FaCaretRight size={normalControlSize} />
      </div>
    </div>
  );
};
