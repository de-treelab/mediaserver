import z from "zod";
import { ApiError } from "../common/ApiError.js";

/**
 * Position of a document within an ordered document listing. Carries the full
 * sort key (rather than just the id) so that a cursor stays valid even after
 * the document it points at was deleted.
 */
export type DocumentCursor = {
  // created_at as formatted by `to_char(created_at, CURSOR_TIMESTAMP_FORMAT)`
  ts: string;
  id: string;
};

// Microsecond precision: JS Dates only keep milliseconds, so the timestamp is
// never round-tripped through a Date.
export const CURSOR_TIMESTAMP_FORMAT = `YYYY-MM-DD"T"HH24:MI:SS.US`;

const cursorSchema = z.object({
  t: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}$/),
  i: z.guid(),
});

export const encodeDocumentCursor = ({ ts, id }: DocumentCursor): string =>
  Buffer.from(JSON.stringify({ t: ts, i: id })).toString("base64url");

export const decodeDocumentCursor = (cursor: string): DocumentCursor => {
  try {
    const parsed = cursorSchema.parse(
      JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")),
    );
    return { ts: parsed.t, id: parsed.i.toLowerCase() };
  } catch {
    throw new ApiError("InvalidCursor", 400, "Invalid pagination cursor");
  }
};
