import type { FileServiceConfig } from "../files/FileService.js";
import type { DbServiceConfig } from "../sql/DbService.js";
import type { MigrationServiceConfig } from "../sql/MigrationService.js";
import {
  InvalidEnvironmentVariableError,
  MissingEnvironmentVariableError,
} from "./EnvironmentError.js";

const validStages = ["development", "staging", "production"] as const;

export class EnvironmentService {
  private getStringEnvVar(key: string): string | undefined {
    return process.env[key];
  }
  private getRequiredStringEnvVar(key: string): string {
    const value = this.getStringEnvVar(key);
    if (!value) {
      throw new MissingEnvironmentVariableError(key);
    }
    return value;
  }
  private getNumberEnvVar(key: string): number | undefined {
    const value = this.getStringEnvVar(key);
    if (!value) {
      return undefined;
    }
    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
      throw new InvalidEnvironmentVariableError(key, value, "<float>");
    }

    return parsed;
  }
  private getRequiredNumberEnvVar(key: string): number {
    const value = this.getNumberEnvVar(key);
    if (value === undefined) {
      throw new MissingEnvironmentVariableError(key);
    }
    return value;
  }

  public get backendPort(): number {
    return this.getRequiredNumberEnvVar("BACKEND_PORT");
  }

  public get databaseConfig(): DbServiceConfig {
    return {
      host: this.getRequiredStringEnvVar("POSTGRES_HOST"),
      port: this.getRequiredNumberEnvVar("POSTGRES_PORT"),
      user: this.getRequiredStringEnvVar("POSTGRES_USER"),
      password: this.getRequiredStringEnvVar("POSTGRES_PASSWORD"),
      database: this.getRequiredStringEnvVar("POSTGRES_DB"),
    };
  }

  public get stage(): (typeof validStages)[number] {
    const stage = this.getRequiredStringEnvVar("STAGE");
    const validatedStage = validStages.find((s) => s === stage);
    if (!validatedStage) {
      throw new InvalidEnvironmentVariableError(
        "STAGE",
        stage,
        validStages.join(", "),
      );
    }
    return validatedStage;
  }

  public get migrationServiceConfig(): MigrationServiceConfig {
    return {
      migrationsDir: this.getRequiredStringEnvVar("MIGRATIONS_DIR"),
      ignoreChecksumMismatches:
        this.getStringEnvVar("IGNORE_MIGRATION_CHECKSUM_MISMATCHES") ===
          "true" && this.stage !== "production",
    };
  }

  public get fileUploadSizeLimit(): number {
    return this.getRequiredNumberEnvVar("MAX_FILE_UPLOAD_SIZE");
  }

  public get websocketPort(): number {
    return this.getRequiredNumberEnvVar("WEBSOCKET_PORT");
  }

  public get fileServiceConfig(): FileServiceConfig {
    return {
      defaultThumbnailPath: this.getRequiredStringEnvVar(
        "DEFAULT_THUMBNAIL_PATH",
      ),
      documentStoreConfigPath: this.getRequiredStringEnvVar(
        "DOCUMENT_STORE_CONFIG_PATH",
      ),
    };
  }
}
