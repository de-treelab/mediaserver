import { useCallback, useMemo } from "react";
import { useEasySearchParams } from "./useEasySearchParams";

/** Page of a cursor paginated listing; neither cursor means the first page. */
export type PagePosition = { after?: string; before?: string };

export const clearPagePosition = (params: URLSearchParams) => {
  params.delete("after");
  params.delete("before");
};

/** Writes `position` into `params`, replacing any previous position. */
export const setPagePosition = (
  params: URLSearchParams,
  position: PagePosition,
) => {
  clearPagePosition(params);
  if (position.after) params.set("after", position.after);
  else if (position.before) params.set("before", position.before);
};

/**
 * Cursor based counterpart of `usePageOffsetAndLimitParams`: the current page
 * is identified by the `after` / `before` search parameters, so a URL always
 * points at the same documents regardless of documents added in between.
 */
export const useCursorPageParams = (initialLimit = 60) => {
  const {
    params: { after, before, limit: searchLimit },
    setSearchParams,
  } = useEasySearchParams(["after", "before", "limit"]);

  const limit = useMemo(() => {
    const parsed = parseInt(searchLimit ?? "");
    return isNaN(parsed) || parsed < 1 ? initialLimit : parsed;
  }, [searchLimit, initialLimit]);

  const setPosition = useCallback(
    (position: PagePosition) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        setPagePosition(next, position);
        return next;
      });
    },
    [setSearchParams],
  );

  const resetPosition = useCallback(() => setPosition({}), [setPosition]);

  // Only one cursor is honoured, mirroring `setPagePosition`
  const position = useMemo<PagePosition>(
    () => (after ? { after } : before ? { before } : {}),
    [after, before],
  );

  return { limit, position, setPosition, resetPosition };
};
