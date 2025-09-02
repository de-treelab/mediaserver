import { ApiError } from "../../common/ApiError.js";

export class TooManyConnectionsError extends ApiError {
  constructor() {
    super("TooManyConnectionsError", 500, "Too many database connections");
  }
}
