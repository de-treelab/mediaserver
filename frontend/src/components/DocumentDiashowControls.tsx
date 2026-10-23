import {
  FaChevronLeft,
  FaChevronRight,
  FaPause,
  FaPlay,
} from "react-icons/fa6";
import { IconButton } from "./IconButton";
import { AutoHideOverlay } from "./AutoHideOverlay";
import { twMerge } from "tailwind-merge";
import { MdFullscreenExit, MdInfoOutline } from "react-icons/md";
import { useTranslation } from "react-i18next";

type Props = {
  nextDocument: () => void;
  previousDocument: () => void;
  togglePause: () => void;
  setTimeoutValue: (timeout: number) => void;
  timeout: number;
  paused: boolean;
  toggleInfoPanel: () => void;
  showInfoPanel: boolean;
  endPresentation: () => void;
};

export const DocumentDiashowControls = ({
  nextDocument,
  previousDocument,
  togglePause,
  setTimeoutValue,
  timeout,
  paused,
  toggleInfoPanel,
  showInfoPanel,
  endPresentation,
}: Props) => {
  const { t } = useTranslation();

  return (
    <AutoHideOverlay className="bottom-0 flex justify-center gap-4 bg-surface-2 p-2">
      <IconButton
        onClick={previousDocument}
        className="bg-surface-1 rounded-full p-2 hover:bg-surface-3"
      >
        <FaChevronLeft size={16} />
      </IconButton>
      <IconButton
        onClick={togglePause}
        className="bg-surface-1 rounded-full p-2 hover:bg-surface-3"
      >
        {paused ? <FaPlay size={16} /> : <FaPause size={16} />}
      </IconButton>
      <IconButton
        onClick={nextDocument}
        className="bg-surface-1 rounded-full p-2 hover:bg-surface-3"
      >
        <FaChevronRight size={16} />
      </IconButton>
      <div>
        <input
          type="number"
          value={timeout}
          onChange={(e) => setTimeoutValue(Number(e.target.value))}
          className="ml-4 w-16 bg-surface-1 rounded p-1 text-center"
          min={1}
        />
        <span className="ml-1 text-sm text-text-secondary">
          {t("document.preview.intervalUnit")}
        </span>
      </div>
      <IconButton
        onClick={toggleInfoPanel}
        className={twMerge(
          "bg-surface-1 rounded-full p-2 hover:bg-surface-3",
          showInfoPanel && "text-accent-subtle",
        )}
      >
        <MdInfoOutline size={16} />
      </IconButton>
      <IconButton
        onClick={endPresentation}
        title={t("document.preview.endPresentation")}
        className="bg-surface-1 rounded-full p-2 hover:bg-surface-3"
      >
        <MdFullscreenExit size={16} />
      </IconButton>
    </AutoHideOverlay>
  );
};
