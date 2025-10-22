export const replaceWordAtCursor = (
  text: string,
  cursorPos: number,
  replacement: string,
): { newText: string; newCursorPos: number } => {
  const left = text.slice(0, cursorPos);
  const right = text.slice(cursorPos);

  const leftMatch = left.match(/(\S+)$/);
  const rightMatch = right.match(/^(\S+)/);

  const start = leftMatch ? cursorPos - leftMatch[1].length : cursorPos;
  const end = rightMatch ? cursorPos + rightMatch[1].length : cursorPos;

  const newText = text.slice(0, start) + replacement + text.slice(end);
  const newCursorPos = start + replacement.length;

  return {
    newText,
    newCursorPos,
  };
};
