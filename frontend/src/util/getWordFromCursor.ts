export const getWordFromCursor = (
  text: string,
  cursorPos: number,
): { word: string; start: number; end: number } => {
  const left = text.slice(0, cursorPos);
  const right = text.slice(cursorPos);

  const leftMatch = left.match(/(\S+)$/);
  const rightMatch = right.match(/^(\S+)/);

  const start = leftMatch ? cursorPos - leftMatch[1].length : cursorPos;
  const end = rightMatch ? cursorPos + rightMatch[1].length : cursorPos;

  return {
    word: text.slice(start, end),
    start,
    end,
  };
};
