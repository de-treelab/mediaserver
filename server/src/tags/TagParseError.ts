import { ApiError } from "../common/ApiError.js";

export class TagParseError extends ApiError {
  constructor(message: string) {
    super("TagParseError", 400, message);
  }
}
