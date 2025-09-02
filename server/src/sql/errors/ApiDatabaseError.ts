import { ApiError } from "../../common/ApiError.js";

export class ApiDatabaseError extends ApiError {
  constructor(public readonly databaseError: string | undefined) {
    super(
      "ApiDatabaseError",
      500,
      `Database error occurred: See logs for details`,
    );
  }
}
