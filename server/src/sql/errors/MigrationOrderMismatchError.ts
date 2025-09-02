import { ApiError } from "../../common/ApiError.js";

export class MigrationOrderMismatchError extends ApiError {
  constructor(
    public readonly expectedMigration: string,
    public readonly actualMigration: string,
  ) {
    super(
      "MigrationOrderMismatchError",
      500,
      `Migration file order mismatch: ${expectedMigration} !== ${actualMigration}`,
    );
  }
}
