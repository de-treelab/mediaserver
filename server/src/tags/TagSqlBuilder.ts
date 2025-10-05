import {
  AndTag,
  MetaTag,
  NotTag,
  OrTag,
  Tag,
  TagIdCache,
  TrueTag,
  type Filter,
} from "@lars_hagemann/tags";

export type TagSqlBuilderConfig = {
  userdataTableName: string;
  userdataTableIdColumn: string;
  userdataTableColumns: string[];
};

export type SelectStatement = {
  select: string;
  from: string;
  joins?: {
    join: "INNER" | "LEFT" | "RIGHT";
    table: string;
    on: string;
  }[];
  groupBy?: string;
  having?: string;
  sort?: {
    field: "timestamp" | "random" | string;
    direction?: "asc" | "desc";
    nulls?: "first" | "last";
  }[];
  where?: string;
  limit?: string | number;
  offset?: string | number;
};

export type OnConflict =
  | {
      action: "DO NOTHING";
    }
  | {
      action: "DO UPDATE";
      target?: string | string[];
      set: { [column: string]: string };
    };

export type UpdateStatement = {
  table: string;
  set: { [column: string]: string };
  where?: string;
  onConflict?: OnConflict;
};

export type DeleteStatement = {
  table: string;
  where?: string;
};

export type InsertStatement = {
  table: string;
  columns: string[];
  values: (string | number)[];
  onConflict?: OnConflict;
};

export const buildQueryFromSelectStatement = (stmt: SelectStatement) => {
  const query = `SELECT ${stmt.select} FROM ${stmt.from}`;
  const joinClauses = (stmt.joins ?? [])
    .map((join) => `${join.join} JOIN ${join.table} ON ${join.on}`)
    .join(" ");
  const whereClause = stmt.where ? `WHERE ${stmt.where}` : "";
  const groupByClause = stmt.groupBy ? `GROUP BY ${stmt.groupBy}` : "";
  const havingClause = stmt.having ? `HAVING ${stmt.having}` : "";
  const orderByClause =
    stmt.sort && stmt.sort.length > 0
      ? `ORDER BY ${stmt.sort
          .map(
            (s) =>
              `${s.field} ${s.direction?.toUpperCase() || ""} ${s.nulls ? `NULLS ${s.nulls.toUpperCase()}` : ""}`,
          )
          .join(", ")}`
      : "";
  const limitClause = stmt.limit ? `LIMIT ${stmt.limit}` : "";
  const offsetClause = stmt.offset ? `OFFSET ${stmt.offset}` : "";

  return `${query} ${joinClauses} ${whereClause} ${groupByClause} ${havingClause} ${orderByClause} ${limitClause} ${offsetClause}`.trim();
};

const buildOnConflictAction = (action: OnConflict) => {
  if (action.action === "DO NOTHING") {
    return "DO NOTHING";
  } else {
    const targetClause = action.target
      ? `(${Array.isArray(action.target) ? action.target.join(", ") : action.target})`
      : "";
    const setClause = `SET ${Object.entries(action.set)
      .map(([col, val]) => `${col} = ${val}`)
      .join(", ")}`;
    return `${targetClause} ${action.action} ${setClause}`;
  }
};

export const buildQueryFromUpdateStatement = (stmt: UpdateStatement) => {
  const setClause = `SET ${Object.entries(stmt.set)
    .map(([col, val]) => `${col} = ${val}`)
    .join(", ")}`;
  const whereClause = stmt.where ? `WHERE ${stmt.where}` : "";
  const onConflictClause = stmt.onConflict
    ? `ON CONFLICT ${buildOnConflictAction(stmt.onConflict)}`
    : "";

  return `UPDATE ${stmt.table} ${setClause} ${whereClause} ${onConflictClause}`;
};

export const buildQueryFromDeleteStatement = (stmt: DeleteStatement) => {
  const whereClause = stmt.where ? `WHERE ${stmt.where}` : "";
  return `DELETE FROM ${stmt.table} ${whereClause}`;
};

export const buildQueryFromInsertStatement = (stmt: InsertStatement) => {
  const columnsClause = `(${stmt.columns.join(", ")})`;
  const valuesClause = `VALUES (${stmt.values
    .map((val) => (typeof val === "string" ? val : val.toString()))
    .join(", ")})`;
  const onConflictClause = stmt.onConflict
    ? `ON CONFLICT ${buildOnConflictAction(stmt.onConflict)}`
    : "";

  return `INSERT INTO ${stmt.table} ${columnsClause} ${valuesClause} ${onConflictClause}`;
};

export type TagSqlBuilderResult<
  T = SelectStatement,
  Parameters extends string[] = [],
> =
  | {
      success: false;
      message: string;
    }
  | {
      success: true;
      stmt: T;
    };

type CurrentParse = {
  sortBy: "timestamp" | "random";
  sortDirection: "asc" | "desc";
};

export class TagSqlBuilder {
  private readonly currentParse: CurrentParse;

  constructor(
    private readonly builderConfig: TagSqlBuilderConfig,
    private readonly tagIdCache: TagIdCache,
  ) {
    this.currentParse = {
      sortBy: "timestamp",
      sortDirection: "asc",
    };
  }

  private parseMetaTag(tag: MetaTag): string {
    if (tag.key === "sort") {
      switch (tag.value) {
        case "random":
          this.currentParse.sortBy = "random";
          break;
        case "oldest":
          this.currentParse.sortBy = "timestamp";
          this.currentParse.sortDirection = "asc";
          break;
        case "newest":
          this.currentParse.sortBy = "timestamp";
          this.currentParse.sortDirection = "desc";
          break;
      }
      return `1=1`;
    }

    return `SUM(CASE WHEN ut.tag_id = '${this.tagIdCache.tagToTagId(
      tag,
    )}' THEN 1 ELSE 0 END) > 0`;
  }

  private sqlFilterConditions(filter: Filter): string {
    if (filter instanceof Tag) {
      try {
        return `SUM(CASE WHEN ut.tag_id = '${this.tagIdCache.tagToTagId(
          filter,
        )}' THEN 1 ELSE 0 END) > 0`;
      } catch (err) {
        if (err instanceof Error && err.message.includes("Tag not found")) {
          // This could be the key of a meta tag that is not listed in the tag id cache
          // For meta tags person:a, person:b etc. and filter 'person' we want to match any person:*
          return "";
        }
        throw err;
      }
    } else if (filter instanceof MetaTag) {
      return this.parseMetaTag(filter);
    } else if (filter instanceof TrueTag) {
      return `1=1`;
    } else if (filter instanceof OrTag) {
      return `(${this.sqlFilterConditions(
        filter.left,
      )} OR ${this.sqlFilterConditions(filter.right)})`;
    } else if (filter instanceof AndTag) {
      return `(${this.sqlFilterConditions(
        filter.left,
      )} AND ${this.sqlFilterConditions(filter.right)})`;
    } else if (filter instanceof NotTag) {
      return `NOT (${this.sqlFilterConditions(filter.inner)})`;
    }

    return "1=1";
  }

  private setupParse() {
    this.currentParse.sortBy = "timestamp";
    this.currentParse.sortDirection = "asc";
  }

  public buildListFilteredEntitiesQuery(filter: Filter): TagSqlBuilderResult {
    this.setupParse();

    try {
      return {
        success: true,
        stmt: {
          select: `${this.builderConfig.userdataTableColumns
            .map((col) => `u.${col}`)
            .join(", ")}, COUNT(*) OVER()::int AS __total`,
          from: `${this.builderConfig.userdataTableName} u`,
          joins: [
            {
              join: "INNER",
              table: "userdata_tags ut",
              on: `u.${this.builderConfig.userdataTableIdColumn} = ut.userdata_id`,
            },
          ],
          groupBy: `u.${this.builderConfig.userdataTableIdColumn}`,
          having: `${this.sqlFilterConditions(filter)}`,
          sort: [
            {
              field: this.currentParse.sortBy,
              direction: this.currentParse.sortDirection,
            },
          ],
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  public buildListEntityTagsQuery(): TagSqlBuilderResult<
    SelectStatement,
    ["$entityId"]
  > {
    try {
      return {
        success: true,
        stmt: {
          select: `t.*, COUNT(ut.userdata_id) AS usage_count`,
          from: `tags t`,
          where: `ut.userdata_id = $entityId`,
          joins: [
            {
              join: "LEFT",
              table: "userdata_tags ut",
              on: `t.id = ut.tag_id`,
            },
          ],
          groupBy: `t.id`,
          sort: [
            {
              field: "t.key",
              direction: "asc",
            },
            {
              field: "t.value",
              direction: "asc",
            },
          ],
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  public buildAddTagToEntityQuery(
    tag: Tag | MetaTag,
  ): TagSqlBuilderResult<InsertStatement, ["$entityId"]> {
    try {
      const id = this.tagIdCache.tagToTagId(tag);
      return {
        success: true,
        stmt: {
          table: "userdata_tags",
          columns: ["userdata_id", "tag_id"],
          values: ["$entityId", id],
          onConflict: {
            action: "DO NOTHING",
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  public buildRemoveTagFromEntityQuery(
    tag: Tag | MetaTag,
  ): TagSqlBuilderResult<DeleteStatement, ["$entityId"]> {
    try {
      const id = this.tagIdCache.tagToTagId(tag);
      return {
        success: true,
        stmt: {
          table: "userdata_tags",
          where: `userdata_id = $entityId AND tag_id = '${id}'`,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  public buildListTagsQuery(): TagSqlBuilderResult<
    SelectStatement,
    ["$limit", "$offset", "$tagKey", "$tagValue"]
  > {
    this.setupParse();

    try {
      return {
        success: true,
        stmt: {
          select: `t.*, COUNT(ut.userdata_id)::int AS usage_count, COUNT(*) OVER()::int AS __total`,
          from: `tags t`,
          joins: [
            {
              join: "LEFT",
              table: "userdata_tags ut",
              on: `t.id = ut.tag_id`,
            },
          ],
          groupBy: `t.id`,
          limit: "$limit",
          offset: "$offset",
          where: `t.key ILIKE '%' || $tagKey || '%' AND ($tagValue::text IS NULL OR (t.value ILIKE '%' || $tagValue::text || '%' AND t.key = $tagKey))`,
          sort: [
            {
              field: "usage_count",
              direction: "desc",
            },
            {
              field: "t.key",
              direction: "asc",
            },
            {
              field: "t.value",
              direction: "asc",
            },
          ],
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
