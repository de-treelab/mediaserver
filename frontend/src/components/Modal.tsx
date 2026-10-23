import { type ReactNode } from "react";
import { MdClose } from "react-icons/md";
import { twMerge } from "tailwind-merge";
import { IconButton } from "./IconButton";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
};

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  className,
}: Props) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay"
      onClick={onClose}
    >
      <div
        className={twMerge(
          "bg-surface-1 rounded-lg w-full max-w-lg mx-4 relative max-h-[90vh] overflow-y-hidden",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center gap-4 px-6 pt-6 pb-4">
          <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
          <IconButton
            className="text-2xl text-text-muted hover:text-text-primary"
            onClick={onClose}
          >
            <MdClose />
          </IconButton>
        </div>
        <div className="overflow-y-auto max-h-[70vh]">
          <div className="px-6 pb-6">{children}</div>
        </div>
      </div>
    </div>
  );
};

/** Right-aligned button row at the bottom of a modal body. */
export const ModalActions = ({ children }: { children: ReactNode }) => (
  <div className="flex justify-end gap-2 pt-2">{children}</div>
);
