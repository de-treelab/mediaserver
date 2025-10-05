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
