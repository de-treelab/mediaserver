import { useCallback, useEffect, useState } from "react";

export const useCursorPos = (
  ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
) => {
  const [cursorPos, setCursorPos] = useState(0);

  const setCursorPosSafe = useCallback(
    (pos: number) => {
      if (ref.current) {
        ref.current.selectionStart = pos;
        ref.current.selectionEnd = pos;
      }
    },
    [ref],
  );

  useEffect(() => {
    if (ref.current) {
      const input = ref.current;
      const onSelectionChange = () => {
        if (document.activeElement === input) {
          setCursorPos(input.selectionStart ?? 0);
        }
      };

      input.addEventListener("selectionchange", onSelectionChange);

      return () => {
        input.removeEventListener("selectionchange", onSelectionChange);
      };
    }
  }, [ref]);

  return { cursorPos, setCursorPos: setCursorPosSafe };
};
