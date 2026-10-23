import { getWordFromCursor } from "./getWordFromCursor";

export const replaceWordAtCursor = (
  text: string,
  cursorPos: number,
  replacement: string,
): { newText: string; newCursorPos: number } => {
  const { start, end } = getWordFromCursor(text, cursorPos);

  const newText = text.slice(0, start) + replacement + text.slice(end);
  const newCursorPos = start + replacement.length;

  return {
    newText,
    newCursorPos,
  };
};
