import { useEffect, useState, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

const MOUSE_MOVE_HIDE_DELAY = 250;

type Props = {
  className?: string;
  children: ReactNode;
};

/**
 * An overlay that is only visible while the mouse is moving, hovering it, or
 * while it contains focus (e.g. an input being edited).
 */
export const AutoHideOverlay = ({ className, children }: Props) => {
  const [visible, setVisible] = useState(true);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    let timeoutId = setTimeout(() => setVisible(false), MOUSE_MOVE_HIDE_DELAY);

    const handleMouseMove = () => {
      setVisible(true);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setVisible(false), MOUSE_MOVE_HIDE_DELAY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div
      className={twMerge(
        "absolute left-0 w-full z-10 transition-opacity duration-300 focus-within:opacity-100",
        visible || hovered ? "opacity-100" : "opacity-0",
        className,
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </div>
  );
};
