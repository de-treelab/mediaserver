export type PaginatedResponse<T> = {
  items: T[];
  total: number;
};

export type CursorPaginatedResponse<T> = PaginatedResponse<T> & {
  // Position of the first item within the full result set
  startIndex: number;
  // Pass as `before` / `after` to fetch the adjacent pages; absent at the
  // start / end of the result set.
  prevCursor?: string;
  nextCursor?: string;
};
