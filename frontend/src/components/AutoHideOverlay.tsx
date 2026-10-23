import { useEffect, useRef, useState, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

const MOUSE_MOVE_HIDE_DELAY = 250;

type Props = {
  className?: string;
  children: ReactNode;
};

/**
 * An overlay that is only visible while the mouse is moving or hovering it.
 * Leaving it starts the hide countdown again. It also stays visible while an
 * input inside it is focused (e.g. the timeout field being edited).
 */
export const AutoHideOverlay = ({ className, children }: Props) => {
  const [visible, setVisible] = useState(true);
  const hovered = useRef(false);
  const hideTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const scheduleHide = () => {
    clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => {
      if (!hovered.current) setVisible(false);
    }, MOUSE_MOVE_HIDE_DELAY);
  };

  useEffect(() => {
    scheduleHide();

    const handleMouseMove = () => {
      setVisible(true);
      scheduleHide();
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(hideTimeout.current);
    };
  }, []);

  return (
    <div
      className={twMerge(
        "absolute left-0 w-full z-10 transition-opacity duration-300 has-[input:focus]:opacity-100",
        visible ? "opacity-100" : "opacity-0",
        className,
      )}
      onMouseEnter={() => {
        hovered.current = true;
        setVisible(true);
      }}
      onMouseLeave={() => {
        hovered.current = false;
        scheduleHide();
      }}
    >
      {children}
    </div>
  );
};
