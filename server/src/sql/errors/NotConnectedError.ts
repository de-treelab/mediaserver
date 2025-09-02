import { ApiError } from "../../common/ApiError.js";

export class NotConnectedError extends ApiError {
  constructor() {
    super("NotConnectedError", 500, "Database connection is not established");
  }
}
