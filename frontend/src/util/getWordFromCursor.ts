const isQuote = (c: string) => c === '"' || c === "`";

/**
 * The whitespace-delimited word around the cursor. Whitespace inside a quoted
 * string (e.g. `collection:"Summer 2024"`) does not end a word, so quoted tag
 * values are completed as a whole.
 */
export const getWordFromCursor = (
  text: string,
  cursorPos: number,
): { word: string; start: number; end: number } => {
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < cursorPos; i++) {
    const c = text[i]!;
    if (quote) {
      if (c === quote) quote = null;
    } else if (isQuote(c)) {
      quote = c;
    } else if (/\s/.test(c)) {
      start = i + 1;
    }
  }

  let end = cursorPos;
  for (; end < text.length; end++) {
    const c = text[end]!;
    if (quote) {
      if (c === quote) quote = null;
    } else if (isQuote(c)) {
      quote = c;
    } else if (/\s/.test(c)) {
      break;
    }
  }

  return {
    word: text.slice(start, end),
    start,
    end,
  };
};
