import { Client, type ClientConfig, type QueryConfig } from "pg";
import type { EnvironmentService } from "../common/EnvironmentService.js";
import z from "zod";
import { withErrorHandler } from "../common/withErrorHandler.js";
import type { LoggingService } from "../common/LoggingService.js";
import { NotConnectedError } from "./errors/NotConnectedError.js";
import { TooManyConnectionsError } from "./errors/TooManyConnectionsError.js";
import { InvalidRowNumberError } from "./errors/InvalidRowNumberError.js";
import { RowSchemaMismatchError } from "./errors/RowSchemaMismatchError.js";

export type DbServiceConfig = ClientConfig;

abstract class DbTask {
  abstract one<ResultSchema extends z.ZodObject>(
    schema: ResultSchema,
    queryTextOrConfig: string | QueryConfig<unknown[]>,
    values?: unknown[] | Record<string, unknown>,
  ): Promise<z.infer<ResultSchema>>;

  abstract many<ResultSchema extends z.ZodObject>(
    schema: ResultSchema,
    queryTextOrConfig: string | QueryConfig<unknown[]>,
    values?: unknown[] | Record<string, unknown>,
  ): Promise<z.infer<ResultSchema>[]>;

  abstract any<ResultSchema extends z.ZodObject>(
    schema: ResultSchema,
    queryTextOrConfig: string | QueryConfig<unknown[]>,
    values?: unknown[] | Record<string, unknown>,
  ): Promise<z.infer<ResultSchema>[]>;

  abstract oneOrNone<ResultSchema extends z.ZodObject>(
    schema: ResultSchema,
    queryTextOrConfig: string | QueryConfig<unknown[]>,
    values?: unknown[] | Record<string, unknown>,
  ): Promise<z.infer<ResultSchema> | null>;

  abstract none(
    queryTextOrConfig: string | QueryConfig<unknown[]>,
    values?: unknown[] | Record<string, unknown>,
  ): Promise<void>;

  abstract transaction(onTransaction: () => Promise<void>): Promise<void>;
}

const escapeValues = (
  queryTextOrConfig: string | QueryConfig<unknown[]>,
  values?: unknown[] | Record<string, unknown>,
): [string | QueryConfig<unknown[]>, unknown[] | undefined] => {
  if (values === undefined) {
    return [queryTextOrConfig, undefined];
  }

  if (Array.isArray(values)) {
    return [queryTextOrConfig, values];
  }

  // parse $keyInValuesObject and $otherKeyInValuesObject into
  // $1, $2, etc...
  const keys = Object.keys(values);
  const placeholders = keys.map((_, i) => `$${i + 1}`);
  const query =
    typeof queryTextOrConfig === "string"
      ? queryTextOrConfig.replace(/\$(\w+)/g, () => placeholders.shift()!)
      : queryTextOrConfig;

  return [query, Object.values(values)];
};

export class DbService implements DbTask {
  private readonly config: DbServiceConfig;
  private client_: Client | undefined;

  constructor(
    envService: EnvironmentService,
    private readonly logger: LoggingService,
    private readonly configOverride?: DbServiceConfig,
  ) {
    this.config = {
      ...envService.databaseConfig,
      ...(this.configOverride || {}),
    };
  }

  private get client(): Client {
    if (!this.client_) {
      throw new NotConnectedError();
    }
    return this.client_;
  }

  async connect(): Promise<void> {
    if (this.client_) {
      throw new TooManyConnectionsError();
    }

    this.client_ = new Client({
      ...this.config,
    });

    await this.client.connect();
    this.client.on("notice", (msg) => this.logger.info("Postgres notice", msg));
    const originalQuery = this.client.query.bind(this.client);
    // @ts-expect-error abcd
    this.client.query = async (...args: Parameters<typeof originalQuery>) => {
      this.logger.debug("Postgres query", args[0]);
      return originalQuery(...args);
    };
  }

  async disconnect(): Promise<void> {
    await this.client.end();
    this.client_ = undefined;
  }

  @withErrorHandler
  async one<ResultSchema extends z.ZodObject>(
    schema: ResultSchema,
    queryTextOrConfig: string | QueryConfig<unknown[]>,
    values?: unknown[] | Record<string, unknown>,
  ): Promise<z.infer<ResultSchema>> {
    const result = await this.client.query(
      ...escapeValues(queryTextOrConfig, values),
    );
    if (result.rowCount !== 1) {
      throw new InvalidRowNumberError(result.rowCount, 1, 1);
    }
    const row = result.rows[0];
    const { data, success } = schema.safeParse(row);
    if (!success) {
      throw new RowSchemaMismatchError();
    }

    return data;
  }

  @withErrorHandler
  async many<ResultSchema extends z.ZodObject>(
    schema: ResultSchema,
    queryTextOrConfig: string | QueryConfig<unknown[]>,
    values?: unknown[] | Record<string, unknown>,
  ): Promise<z.infer<ResultSchema>[]> {
    const result = await this.client.query(
      ...escapeValues(queryTextOrConfig, values),
    );
    if (result.rowCount === 0) {
      throw new InvalidRowNumberError(result.rowCount, 1, Infinity);
    }
    const rows = result.rows;
    const parsed = z.array(schema).safeParse(rows);
    if (!parsed.success) {
      throw new RowSchemaMismatchError();
    }
    return parsed.data;
  }

  @withErrorHandler
  async any<ResultSchema extends z.ZodObject>(
    schema: ResultSchema,
    queryTextOrConfig: string | QueryConfig<unknown[]>,
    values?: unknown[] | Record<string, unknown>,
  ): Promise<z.infer<ResultSchema>[]> {
    const result = await this.client.query(
      ...escapeValues(queryTextOrConfig, values),
    );
    if (result.rowCount === 0) {
      return [];
    }
    const rows = result.rows;
    const parsed = z.array(schema).safeParse(rows);
    if (!parsed.success) {
      throw new RowSchemaMismatchError();
    }
    return parsed.data;
  }

  @withErrorHandler
  async oneOrNone<ResultSchema extends z.ZodObject>(
    schema: ResultSchema,
    queryTextOrConfig: string | QueryConfig<unknown[]>,
    values?: unknown[] | Record<string, unknown>,
  ): Promise<z.infer<ResultSchema> | null> {
    const result = await this.client.query(
      ...escapeValues(queryTextOrConfig, values),
    );
    if (result.rowCount === 0) {
      return null;
    }
    const row = result.rows[0];
    const { data, success } = schema.safeParse(row);
    if (!success) {
      throw new RowSchemaMismatchError();
    }

    return data;
  }

  @withErrorHandler
  async transaction(onTransaction: () => Promise<void>): Promise<void> {
    await this.client.query("BEGIN");
    try {
      await onTransaction();
      await this.client.query("COMMIT");
    } catch (error) {
      await this.client.query("ROLLBACK");
      throw error;
    }
  }

  @withErrorHandler
  async none(
    queryTextOrConfig: string | QueryConfig<unknown[]>,
    values?: unknown[] | Record<string, unknown>,
  ): Promise<void> {
    await this.client.query(...escapeValues(queryTextOrConfig, values));
  }
}
