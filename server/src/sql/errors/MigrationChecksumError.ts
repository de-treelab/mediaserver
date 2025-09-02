import { ApiError } from "../../common/ApiError.js";

export class MigrationChecksumError extends ApiError {
  constructor(public readonly migrationName: string) {
    super(
      "MigrationChecksumError",
      500,
      `Migration file checksum mismatch: ${migrationName}`,
    );
  }
}
