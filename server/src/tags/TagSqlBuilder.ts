import {
  AndTag,
  MetaTag,
  NotTag,
  OrTag,
  Tag,
  TagParser,
  TrueTag,
  type Filter,
} from "@lars_hagemann/tags";
import type { TagCache } from "./TagCache.js";
import { CURSOR_TIMESTAMP_FORMAT } from "../documents/DocumentCursor.js";

export type TagSqlBuilderConfig = {
  userdataTableName: string;
  userdataTableIdColumn: string;
  // SQL type of the id column, used to cast cursor/anchor bind parameters
  userdataTableIdType: string;
  userdataTableColumns: string[];
};

export type SelectStatement = {
  with?: { name: string; body: string }[];
  select: string[];
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

const buildQueryOrderByStatement = (stmt: SelectStatement["sort"]) => {
  const orderByClause =
    stmt && stmt.length > 0
      ? `ORDER BY ${stmt
          .map((s) =>
            s.field === "random"
              ? "RANDOM()"
              : `${s.field} ${s.direction?.toUpperCase() || ""} ${s.nulls ? `NULLS ${s.nulls.toUpperCase()}` : ""}`,
          )
          .join(", ")}`
      : "";

  return orderByClause;
};

export const buildQueryFromSelectStatement = (stmt: SelectStatement) => {
  const withClause =
    stmt.with && stmt.with.length > 0
      ? `WITH ${stmt.with.map((c) => `${c.name} AS (${c.body})`).join(", ")} `
      : "";
  const query = `${withClause}SELECT ${stmt.select} FROM ${stmt.from}`;
  const joinClauses = (stmt.joins ?? [])
    .map((join) => `${join.join} JOIN ${join.table} ON ${join.on}`)
    .join(" ");
  const whereClause = stmt.where ? `WHERE ${stmt.where}` : "";
  const groupByClause = stmt.groupBy ? `GROUP BY ${stmt.groupBy}` : "";
  const havingClause = stmt.having ? `HAVING ${stmt.having}` : "";
  const orderByClause = buildQueryOrderByStatement(stmt.sort);

  const limitClause = stmt.limit ? `LIMIT ${stmt.limit}` : "";
  const offsetClause = stmt.offset ? `OFFSET ${stmt.offset}` : "";

  return `${query} ${joinClauses} ${whereClause} ${groupByClause} ${havingClause} ${orderByClause} ${limitClause} ${offsetClause}`.trim();
};

export type FilteredEntitiesQuery = {
  // Grouped select producing the (unordered) filtered entity set.
  filtered: SelectStatement;
  sortBy: "created_at" | "random";
  sortDirection: "asc" | "desc";
  idColumn: string;
  idType: string;
};

/**
 * Which slice of the ordered entity set a page query returns:
 * - first/last: the first/last `$limit` entities
 * - after/before: the `$limit` entities directly after/before the cursor
 *   ($cursorId, plus $cursorTs unless sorting randomly). The cursor entity
 *   itself is excluded and does not need to exist anymore.
 * - around: up to `$limit` entities on either side of the anchor ($anchorId),
 *   the anchor itself included in the "after" half. Rows carry a
 *   `before_anchor` flag telling which half they belong to.
 * - at: the `$limit` entities starting at query index `$at`, so callers can
 *   fetch any part of the listing without knowing a document there.
 *
 * Rows of "before"/"last" come back in reverse order. All placeholders besides
 * the ones listed above are $limit and (when sorting randomly) $seed.
 */
export type FilteredEntitiesPosition =
  | "first"
  | "last"
  | "after"
  | "before"
  | "around"
  | "at";

const filteredEntitiesCte = (q: FilteredEntitiesQuery) =>
  `filtered AS (${buildQueryFromSelectStatement(q.filtered)})`;

export const buildFilteredEntitiesCountQuery = (q: FilteredEntitiesQuery) =>
  `WITH ${filteredEntitiesCte(q)} SELECT COUNT(*)::int AS total FROM filtered`;

export const buildFilteredEntitiesPageQuery = (
  q: FilteredEntitiesQuery,
  position: FilteredEntitiesPosition,
) => {
  const id = q.idColumn;
  const keyCol = q.sortBy === "random" ? "_rand" : "created_at";
  const dir = q.sortDirection.toUpperCase();
  // The entity id breaks ties between equal sort keys (created_at of rows
  // inserted in one transaction, colliding hashes), keeping the order total.
  const windowOrder = `${keyCol} ${dir}, ${id} ${dir}`;
  const forward = q.sortDirection === "asc" ? ">" : "<";
  const backward = q.sortDirection === "asc" ? "<" : ">";

  const keyOf = (idParam: string) => {
    const typedId = `${idParam}::${q.idType}`;
    if (q.sortBy === "random") {
      return `(HASHTEXT(${typedId}::text || $seed::text), ${typedId})`;
    }
    if (idParam === "$anchorId") {
      return `((SELECT created_at FROM ${q.filtered.from} WHERE u.${id} = ${typedId}), ${typedId})`;
    }
    return `($cursorTs::timestamp, ${typedId})`;
  };
  const rowKey = `(${keyCol}, ${id})`;

  const ordered =
    `ordered AS (SELECT *, ` +
    `COUNT(*) OVER()::int AS __total, ` +
    `row_number() OVER w - 1 AS query_index, ` +
    `LAG(${id}) OVER w AS previous_id, ` +
    `LEAD(${id}) OVER w AS next_id, ` +
    `to_char(created_at, '${CURSOR_TIMESTAMP_FORMAT}') AS cursor_ts ` +
    `FROM filtered WINDOW w AS (ORDER BY ${windowOrder}))`;

  const slice = (
    where: string | undefined,
    order: "ASC" | "DESC",
    select = "*",
  ) =>
    `SELECT ${select} FROM ordered ${where ? `WHERE ${where} ` : ""}ORDER BY query_index ${order} LIMIT $limit`;

  let body: string;
  switch (position) {
    case "first":
      body = slice(undefined, "ASC");
      break;
    case "last":
      body = slice(undefined, "DESC");
      break;
    case "after":
      body = slice(`${rowKey} ${forward} ${keyOf("$cursorId")}`, "ASC");
      break;
    case "before":
      body = slice(`${rowKey} ${backward} ${keyOf("$cursorId")}`, "DESC");
      break;
    case "around":
      body =
        `(${slice(`${rowKey} ${backward} ${keyOf("$anchorId")}`, "DESC", "*, true AS before_anchor")}) ` +
        `UNION ALL ` +
        `(${slice(`${rowKey} ${forward}= ${keyOf("$anchorId")}`, "ASC", "*, false AS before_anchor")})`;
      break;
    case "at":
      body = slice("query_index >= $at", "ASC");
      break;
  }

  return `WITH ${filteredEntitiesCte(q)}, ${ordered} ${body}`;
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Parameters extends string[] = [],
> =
  | {
      success: false;
      message: string;
    }
  | {
      success: true;
      stmt: T;
      // Named bind parameters collected while building the statement. These MUST
      // be merged into the values object passed to DbService so that all dynamic
      // values (tag ids, user-supplied tag keys, ...) are sent as bind
      // parameters rather than interpolated into the SQL string.
      params?: Record<string, string | number>;
    };

export type ResolvedCollection = {
  id: string;
  type: "dynamic" | "static";
  filterExpression: string;
};

/**
 * Looks up the collections a `collection:"<name>"` filter refers to. MUST only
 * return collections visible to the requesting user.
 */
export type CollectionResolver = (
  name: string,
) => Promise<ResolvedCollection[]>;

export type BuildListFilteredEntitiesOptions = {
  // Without a resolver, `collection:<value>` is only matched as a plain tag
  resolveCollections?: CollectionResolver;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Dynamic collections may reference other collections by name
const MAX_COLLECTION_DEPTH = 8;

// Per-build state. Kept local to each build() call (rather than on the instance)
// so that concurrent/interleaved async builds cannot clobber each other's sort
// settings or bind parameters.
type BuildContext = {
  params: Record<string, string | number>;
  next: number;
  sortBy: "created_at" | "random";
  sortDirection: "asc" | "desc";
  resolveCollections?: CollectionResolver;
  // Ids of the dynamic collections currently being expanded (cycle detection)
  expanding: string[];
};

export class TagSqlBuilder {
  constructor(
    private readonly builderConfig: TagSqlBuilderConfig,
    private readonly tagCache: TagCache,
  ) {}

  private newContext(resolveCollections?: CollectionResolver): BuildContext {
    return {
      params: {},
      next: 0,
      sortBy: "created_at",
      sortDirection: "desc",
      ...(resolveCollections && { resolveCollections }),
      expanding: [],
    };
  }

  private tagIdCondition(ctx: BuildContext, tagId: string): string {
    return `SUM(CASE WHEN ut.tag_id = ${this.addParam(ctx, tagId)} THEN 1 ELSE 0 END) > 0`;
  }

  /**
   * `collection:"<name>"`: matches the members of every visible collection with
   * that name. Static collections match their `collection:<id>` membership tag,
   * dynamic ones are expanded into their filter expression.
   */
  private async collectionByNameCondition(
    name: string,
    resolveCollections: CollectionResolver,
    ctx: BuildContext,
  ): Promise<string> {
    const collections = await resolveCollections(name);
    const conditions: string[] = [];
    for (const collection of collections) {
      if (collection.type === "static") {
        try {
          const tagId = await this.tagCache.tagToTagId(
            new MetaTag("collection", collection.id),
          );
          conditions.push(this.tagIdCondition(ctx, tagId));
        } catch (err) {
          // The membership tag only exists once a document was added
          if (err instanceof Error && err.message.includes("Tag not found")) {
            continue;
          }
          throw err;
        }
        continue;
      }

      if (ctx.expanding.includes(collection.id)) {
        throw new Error(`Collection "${name}" references itself`);
      }
      if (ctx.expanding.length >= MAX_COLLECTION_DEPTH) {
        throw new Error(`Collection "${name}" is nested too deeply`);
      }

      let filter: Filter;
      try {
        filter = new TagParser(collection.filterExpression).parse();
      } catch (err) {
        throw new Error(
          `Invalid filter expression in collection "${name}": ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      }
      ctx.expanding.push(collection.id);
      try {
        conditions.push(await this.sqlFilterConditions(filter, ctx));
      } finally {
        ctx.expanding.pop();
      }
    }

    return conditions.length > 0 ? `(${conditions.join(" OR ")})` : "1=0";
  }

  /**
   * Registers a dynamic value as a bind parameter and returns its `$name`
   * placeholder. The `p`-prefix avoids collisions with the caller-supplied
   * placeholders ($limit, $offset, $seed, $userId, $entityId, $cursorId,
   * $cursorTs, $anchorId, $at).
   */
  private addParam(ctx: BuildContext, value: string | number): string {
    const name = `p${ctx.next++}`;
    ctx.params[name] = value;
    return `$${name}`;
  }

  private async parseMetaTag(tag: MetaTag, ctx: BuildContext): Promise<string> {
    if (tag.key === "sort") {
      // The sort of an expanded collection must not override the user's sort
      if (ctx.expanding.length > 0) return `1=1`;
      switch (tag.value) {
        case "random":
          ctx.sortBy = "random";
          break;
        case "oldest":
          ctx.sortBy = "created_at";
          ctx.sortDirection = "asc";
          break;
        case "newest":
          ctx.sortBy = "created_at";
          ctx.sortDirection = "desc";
          break;
      }
      return `1=1`;
    }

    if (
      tag.key === "collection" &&
      ctx.resolveCollections &&
      !UUID_PATTERN.test(tag.value)
    ) {
      return await this.collectionByNameCondition(
        tag.value,
        ctx.resolveCollections,
        ctx,
      );
    }

    const tagId = await this.tagCache.tagToTagId(tag);
    return this.tagIdCondition(ctx, tagId);
  }

  private async sqlFilterConditions(
    filter: Filter,
    ctx: BuildContext,
  ): Promise<string> {
    if (filter instanceof Tag) {
      try {
        const tagId = await this.tagCache.tagToTagId(filter);
        return this.tagIdCondition(ctx, tagId);
      } catch (err) {
        if (err instanceof Error && err.message.includes("Tag not found")) {
          // This could be the key of a meta tag that is not listed in the tag id cache
          // For meta tags person:a, person:b etc. and filter 'person' we want to match any key=person and value=<any>.
          // filter.key is user-supplied, so it MUST be bound as a parameter.
          return `EXISTS (SELECT * FROM userdata_tags sut INNER JOIN tags ON tags.id = sut.tag_id WHERE tags.key = ${this.addParam(ctx, filter.key)} AND sut.userdata_id = u.id)`;
        }
        throw err;
      }
    } else if (filter instanceof MetaTag) {
      return await this.parseMetaTag(filter, ctx);
    } else if (filter instanceof TrueTag) {
      return `1=1`;
    } else if (filter instanceof OrTag) {
      return `(${await this.sqlFilterConditions(
        filter.left,
        ctx,
      )} OR ${await this.sqlFilterConditions(filter.right, ctx)})`;
    } else if (filter instanceof AndTag) {
      return `(${await this.sqlFilterConditions(
        filter.left,
        ctx,
      )} AND ${await this.sqlFilterConditions(filter.right, ctx)})`;
    } else if (filter instanceof NotTag) {
      return `NOT (${await this.sqlFilterConditions(filter.inner, ctx)})`;
    }

    return "1=1";
  }

  /**
   * Builds the grouped select producing the filtered entity set together with
   * the ordering it must be paginated by. Use `buildFilteredEntitiesPageQuery`
   * / `buildFilteredEntitiesCountQuery` to turn it into SQL. Callers may extend
   * `filtered.having` (e.g. with access scope conditions) beforehand.
   */
  public async buildListFilteredEntitiesQuery(
    filter: Filter,
    { resolveCollections }: BuildListFilteredEntitiesOptions = {},
  ): Promise<TagSqlBuilderResult<FilteredEntitiesQuery>> {
    const ctx = this.newContext(resolveCollections);

    const idCol = this.builderConfig.userdataTableIdColumn;
    const tableName = this.builderConfig.userdataTableName;
    const staticCols = this.builderConfig.userdataTableColumns;

    try {
      const havingCondition = await this.sqlFilterConditions(filter, ctx);

      const select = [...staticCols.map((col) => `u.${col}`), "u.created_at"];
      if (ctx.sortBy === "random") {
        // Deterministic hash per (row, seed) so that every query with the same
        // seed (gallery pages, preview strip, ...) sees the same ordering.
        select.push(`HASHTEXT(u.${idCol}::text || $seed::text) AS _rand`);
      }

      return {
        success: true,
        params: ctx.params,
        stmt: {
          filtered: {
            select,
            from: `${tableName} u`,
            joins: [
              {
                join: "LEFT",
                table: "userdata_tags ut",
                on: `u.${idCol} = ut.userdata_id`,
              },
            ],
            groupBy: `u.${idCol}`,
            having: havingCondition,
          },
          sortBy: ctx.sortBy,
          sortDirection: ctx.sortBy === "random" ? "asc" : ctx.sortDirection,
          idColumn: idCol,
          idType: this.builderConfig.userdataTableIdType,
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
          select: ["t.*", "COUNT(ut.userdata_id) AS usage_count"],
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

  public async buildAddTagToEntityQuery(
    tag: Tag | MetaTag,
  ): Promise<TagSqlBuilderResult<InsertStatement, ["$entityId"]>> {
    try {
      const id = await this.tagCache.tagToTagId(tag);
      return {
        success: true,
        params: { tagId: id },
        stmt: {
          table: "userdata_tags",
          columns: ["userdata_id", "tag_id"],
          values: ["$entityId", "$tagId"],
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

  public async buildRemoveTagFromEntityQuery(
    tag: Tag | MetaTag,
  ): Promise<TagSqlBuilderResult<DeleteStatement, ["$entityId"]>> {
    try {
      const id = await this.tagCache.tagToTagId(tag);
      return {
        success: true,
        params: { tagId: id },
        stmt: {
          table: "userdata_tags",
          where: `userdata_id = $entityId AND tag_id = $tagId`,
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
    try {
      return {
        success: true,
        stmt: {
          select: [
            "t.*",
            "COUNT(ut.userdata_id)::int AS usage_count",
            "COUNT(*) OVER()::int AS __total",
          ],
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
