import { ApiError } from "../../common/ApiError.js";

export class InvalidRowNumberError extends ApiError {
  constructor(
    public readonly rows: number | null,
    public readonly minExpected: number,
    public readonly maxExpected: number,
  ) {
    super(
      "InvalidRowNumberError",
      500,
      `Invalid row number: ${rows}. Expected between ${minExpected} and ${maxExpected}.`,
    );
  }
}
