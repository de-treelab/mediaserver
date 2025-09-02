import { ApiError } from "../../common/ApiError.js";

export class MissingMigrationError extends ApiError {
  constructor(migrationName: string) {
    super(
      "MissingMigrationError",
      500,
      `Missing migration file: ${migrationName}`,
    );
  }
}
