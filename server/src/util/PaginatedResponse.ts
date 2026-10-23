import z from "zod";

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
};

export const withPaginationSchema = z.object({
  __total: z.number().min(0),
});
export type WithPaginationSchema = z.infer<typeof withPaginationSchema>;

export const paginated = <T extends z.ZodObject>(schema: T) =>
  schema.and(withPaginationSchema);

export const toPaginatedResponse = <
  T extends z.infer<typeof withPaginationSchema>,
>(
  data: T[],
): PaginatedResponse<Omit<T, "__total">> => {
  const total = data[0]?.__total ?? 0;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const items = data.map(({ __total, ...item }) => item);
  return { total, items };
};

export type CursorPaginatedResponse<T> = PaginatedResponse<T> & {
  // Position of the first item within the full result set
  startIndex: number;
  // Pass as `before` / `after` to fetch the adjacent pages; absent at the
  // start / end of the result set.
  prevCursor: string | undefined;
  nextCursor: string | undefined;
};
