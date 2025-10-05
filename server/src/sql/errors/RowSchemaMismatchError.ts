import type z from "zod";
import { ApiError } from "../../common/ApiError.js";

export class RowSchemaMismatchError extends ApiError {
  constructor(private readonly issues: z.ZodError["issues"] | undefined) {
    super("RowSchemaMismatchError", 500, `Row does not match schema`);
  }
}
