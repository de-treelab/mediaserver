export type PaginatedResponse<T> = {
    items: T[];
    total: number;
};
export type CursorPaginatedResponse<T> = PaginatedResponse<T> & {
    startIndex: number;
    prevCursor?: string;
    nextCursor?: string;
};
