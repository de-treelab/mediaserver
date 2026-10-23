import { MetaTag, Tag, TagParser } from "@lars_hagemann/tags";
import type { ApiTag } from "../plugins/plugin.js";
export type { ApiTag };
import type { DbService } from "../sql/DbService.js";
import {
  paginated,
  toPaginatedResponse,
  type CursorPaginatedResponse,
  type PaginatedResponse,
} from "../util/PaginatedResponse.js";
import { TagParseError } from "./TagParseError.js";
import {
  buildQueryFromDeleteStatement,
  buildQueryFromInsertStatement,
  buildFilteredEntitiesCountQuery,
  buildFilteredEntitiesIdsQuery,
  buildFilteredEntitiesPageQuery,
  buildQueryFromSelectStatement,
  TagSqlBuilder,
  type CollectionResolver,
} from "./TagSqlBuilder.js";
import {
  encodeDocumentCursor,
  type DocumentCursor,
} from "../documents/DocumentCursor.js";
import z from "zod";
import type {
  Document,
  DocumentWithTags,
} from "../documents/DocumentRepository.js";
import {
  buildScopeClause,
  buildScopeHaving,
} from "../documents/DocumentRepository.js";
import type { TagCache } from "./TagCache.js";
import type { DocumentAccessScope } from "../auth/AccessScope.js";

export interface ListTagsRequest {
  limit: number;
  offset: number;
  tag: ApiTag;
}

export type DocumentListPosition =
  | { type: "first" }
  | { type: "last" }
  | { type: "after"; cursor: DocumentCursor }
  | { type: "before"; cursor: DocumentCursor }
  // Window centered on a document, e.g. for the preview strip
  | { type: "around"; documentId: string }
  // `limit` documents starting at a query index
  | { type: "at"; index: number };

export type ListDocumentsRequest = {
  limit: number;
  position?: DocumentListPosition;
  query: string;
  seed?: string;
  scope?: DocumentAccessScope;
  // Resolves `collection:"<name>"` filters; only plain tags are matched without
  resolveCollections?: CollectionResolver;
  // The user `shared:me` filters refer to
  currentUserId?: string | undefined;
};

/**
 * Documents to operate on: either given by id, or all documents matching a
 * query except the excluded ones (e.g. "select all" in the gallery).
 */
export type DocumentSelection =
  | { type: "ids"; ids: string[] }
  | { type: "query"; query: string; excludedIds: string[] };

const documentRowSchema = z.object({
  id: z.string(),
  mime: z.string(),
  friendly_name: z.string(),
  previous_id: z.string().nullable(),
  next_id: z.string().nullable(),
  query_index: z.coerce.number().int().min(0),
  owner_id: z.string(),
  is_public: z.boolean(),
});

const documentListRowSchema = documentRowSchema.extend({
  cursor_ts: z.string(),
  before_anchor: z.boolean().optional(),
});

const tagRowSchema = z.object({
  id: z.number(),
  key: z.string(),
  value: z.string().nullable(),
  type: z.string(),
});

const tagWithCountRowSchema = tagRowSchema.extend({
  usage_count: z.number().int(),
});

export type ApiTagWithCount = ApiTag & {
  usageCount: number;
};

export class TagRepository {
  private readonly sqlBuilder: TagSqlBuilder;

  constructor(
    private readonly dbService: DbService,
    private readonly tagCache: TagCache,
  ) {
    this.sqlBuilder = new TagSqlBuilder(
      {
        userdataTableName: "documents",
        userdataTableColumns: [
          "id",
          "mime",
          "friendly_name",
          "owner_id",
          "is_public",
        ],
        userdataTableIdColumn: "id",
        userdataTableIdType: "uuid",
      },
      tagCache,
    );
  }

  public async listDocuments({
    limit,
    query,
    seed,
    position = { type: "first" },
    scope = { type: "all" },
    resolveCollections,
    currentUserId,
  }: ListDocumentsRequest): Promise<CursorPaginatedResponse<Document>> {
    if (scope.type === "none") {
      return {
        items: [],
        total: 0,
        startIndex: 0,
        prevCursor: undefined,
        nextCursor: undefined,
      };
    }

    const { stmt, isRandom, filterParams } = await this.buildFilteredQuery(
      query,
      scope,
      resolveCollections,
      currentUserId,
      seed,
    );
    const positionParams =
      position.type === "after" || position.type === "before"
        ? isRandom
          ? { cursorId: position.cursor.id }
          : { cursorId: position.cursor.id, cursorTs: position.cursor.ts }
        : position.type === "around"
          ? { anchorId: position.documentId }
          : position.type === "at"
            ? { at: position.index }
            : {};

    const rows = await this.dbService.any(
      paginated(documentListRowSchema),
      buildFilteredEntitiesPageQuery(stmt, position.type),
      { ...filterParams, ...positionParams, limit },
    );

    let ordered = [...rows].sort((a, b) => a.query_index - b.query_index);
    if (position.type === "around") {
      // Both halves were fetched with `limit` rows each; keep a window of
      // `limit` rows centered on the anchor, shifted inwards at either end.
      const afterStart = ordered.filter((row) => row.before_anchor).length;
      const available = {
        before: afterStart,
        after: ordered.length - afterStart,
      };
      const takeBefore = Math.min(
        available.before,
        Math.max(Math.floor((limit - 1) / 2), limit - available.after),
      );
      const takeAfter = Math.min(available.after, limit - takeBefore);
      ordered = ordered.slice(afterStart - takeBefore, afterStart + takeAfter);
    }

    const first = ordered[0];
    const last = ordered[ordered.length - 1];
    const total =
      first?.__total ??
      (position.type === "first"
        ? 0
        : (
            await this.dbService.one(
              z.object({ total: z.number().int() }),
              buildFilteredEntitiesCountQuery(stmt),
              filterParams,
            )
          ).total);

    const toCursor = (row: (typeof rows)[number]) =>
      encodeDocumentCursor({ ts: row.cursor_ts, id: row.id });

    return {
      items: ordered.map((item) => ({
        id: item.id,
        mime: item.mime,
        friendlyName: item.friendly_name,
        previousId: item.previous_id ?? undefined,
        nextId: item.next_id ?? undefined,
        queryIndex: item.query_index,
        cursor: toCursor(item),
        ownerId: item.owner_id,
        isPublic: item.is_public,
      })),
      total,
      startIndex:
        first?.query_index ??
        (position.type === "after"
          ? total
          : position.type === "at"
            ? Math.min(position.index, total)
            : 0),
      prevCursor: first && first.query_index > 0 ? toCursor(first) : undefined,
      nextCursor:
        last && last.query_index < total - 1 ? toCursor(last) : undefined,
    };
  }

  /** Filtered documents of `query` within `scope`, as used by every listing. */
  private async buildFilteredQuery(
    query: string,
    scope: DocumentAccessScope,
    resolveCollections: CollectionResolver | undefined,
    currentUserId: string | undefined,
    seed?: string,
  ) {
    const filter = new TagParser(query).parse();
    const sql = await this.sqlBuilder.buildListFilteredEntitiesQuery(filter, {
      ...(resolveCollections && { resolveCollections }),
      ...(currentUserId && { currentUserId }),
    });

    if (!sql.success) {
      throw new TagParseError(sql.message);
    }

    const scopeHaving = buildScopeHaving(scope, "u");
    if (scopeHaving) {
      sql.stmt.filtered.having = `(${sql.stmt.filtered.having})${scopeHaving}`;
    }

    const isRandom = sql.stmt.sortBy === "random";
    // Only pass parameters the query references: unreferenced bind parameters
    // have no inferable type and make Postgres reject the query.
    const filterParams = {
      ...(isRandom ? { seed: seed ?? "" } : {}),
      ...(scope.type === "accessible-by" ? { userId: scope.userId } : {}),
      // Bind parameters for the dynamic tag-filter values (tag ids and
      // user-supplied tag keys) collected by the SQL builder.
      ...(sql.params ?? {}),
    };

    return { stmt: sql.stmt, isRandom, filterParams };
  }

  /** Ids of the selected documents that lie within `scope`. */
  public async resolveSelection(
    selection: DocumentSelection,
    scope: DocumentAccessScope = { type: "all" },
    resolveCollections?: CollectionResolver,
    currentUserId?: string,
  ): Promise<string[]> {
    if (scope.type === "none") return [];
    if (selection.type === "ids") {
      return this.filterAccessibleDocumentIds(selection.ids, scope);
    }

    const { stmt, filterParams } = await this.buildFilteredQuery(
      selection.query,
      scope,
      resolveCollections,
      currentUserId,
    );
    const rows = await this.dbService.any(
      z.object({ id: z.string() }),
      buildFilteredEntitiesIdsQuery(stmt),
      filterParams,
    );
    const excluded = new Set(selection.excludedIds);
    return rows.map((row) => row.id).filter((id) => !excluded.has(id));
  }

  /** Tags of the given documents with the number of documents carrying each. */
  public async countTagsOfDocuments(
    documentIds: string[],
  ): Promise<ApiTagWithCount[]> {
    if (documentIds.length === 0) return [];
    const rows = await this.dbService.any(
      tagWithCountRowSchema,
      `SELECT
        tags.id,
        tags.key,
        tags.value,
        tags.type,
        COUNT(DISTINCT userdata_tags.userdata_id)::int AS usage_count
      FROM userdata_tags
      JOIN tags ON tags.id = userdata_tags.tag_id
      WHERE userdata_tags.userdata_id = ANY($ids::uuid[])
      GROUP BY tags.id`,
      { ids: documentIds },
    );
    return rows.map((row) => ({
      key: row.key,
      value: row.value ?? undefined,
      type: row.type,
      usageCount: row.usage_count,
    }));
  }

  public async listDocumentsByIds(
    ids: string[],
    scope: DocumentAccessScope = { type: "all" },
  ): Promise<DocumentWithTags[]> {
    if (scope.type === "none") return [];

    let scopeClause = "";
    const params: Record<string, unknown> = { ids };
    if (scope.type === "public-only") {
      scopeClause = " AND documents.is_public = true";
    } else if (scope.type === "accessible-by") {
      scopeClause =
        " AND (documents.is_public = true OR documents.owner_id = $userId OR EXISTS (SELECT 1 FROM document_shares ds WHERE ds.document_id = documents.id AND ds.shared_with_user_id = $userId))";
      params.userId = scope.userId;
    }

    const items = await this.dbService.any(
      documentRowSchema.and(tagRowSchema.omit({ id: true }).nullable()),
      `SELECT
        documents.id,
        mime,
        friendly_name,
        owner_id,
        is_public,
        NULL as previous_id,
        NULL as next_id,
        0 as query_index,
        tags.key,
        tags.value,
        tags.type
      FROM documents
      LEFT JOIN userdata_tags ON documents.id = userdata_tags.userdata_id
      LEFT JOIN tags ON userdata_tags.tag_id = tags.id
      WHERE documents.id = ANY($ids)${scopeClause}`,
      params,
    );

    const documentsMap: Record<string, DocumentWithTags> = {};

    for (const item of items) {
      if (!documentsMap[item.id]) {
        documentsMap[item.id] = {
          id: item.id,
          mime: item.mime,
          friendlyName: item.friendly_name,
          ownerId: item.owner_id,
          isPublic: item.is_public,
          previousId: undefined,
          nextId: undefined,
          queryIndex: 0,
          tags: [],
        };
      }
      if (item.key) {
        documentsMap[item.id]!.tags.push({
          key: item.key,
          value: item.value ?? undefined,
          type: item.type,
        });
      }
    }

    return Object.values(documentsMap);
  }

  public async listTags(
    request: ListTagsRequest,
  ): Promise<PaginatedResponse<ApiTagWithCount>> {
    const sql = this.sqlBuilder.buildListTagsQuery();

    if (sql.success) {
      const response = await this.dbService.any(
        paginated(tagWithCountRowSchema),
        buildQueryFromSelectStatement(sql.stmt),
        {
          limit: request.limit,
          offset: request.offset,
          tagKey: request.tag.key,
          tagValue: request.tag.value ? request.tag.value : null,
        },
      );
      return toPaginatedResponse(
        response.map((row) => ({
          key: row.key,
          value: row.value ?? undefined,
          usageCount: row.usage_count,
          type: row.type,
          __total: row.__total,
        })),
      );
    } else {
      throw new TagParseError(sql.message);
    }
  }

  public async addTags(tags: ApiTag[]): Promise<void> {
    let i = 1;
    const valuesStmt = tags
      .map(() => {
        return `($${i++}, $${i++}, $${i++})`;
      })
      .join(", ");

    const result = await this.dbService.any(
      z.object({
        id: z.number(),
        key: z.string(),
        value: z.string().nullable(),
      }),
      `INSERT INTO tags (key, value, type) VALUES ${valuesStmt} ON CONFLICT DO NOTHING RETURNING id, key, value`,
      tags
        .map((tag) =>
          tag.value
            ? [tag.key, tag.value, tag.type]
            : [tag.key, null, tag.type],
        )
        .flat(1),
    );

    for (const row of result) {
      this.tagCache.onTagAdded(
        row.value ? new MetaTag(row.key, row.value) : new Tag(row.key),
        row.id.toString(),
      );
    }
  }

  public async addTagToDocument(
    documentId: string,
    tag: ApiTag,
  ): Promise<void> {
    const a = await this.sqlBuilder.buildAddTagToEntityQuery(tag);
    if (a.success) {
      await this.dbService.none(buildQueryFromInsertStatement(a.stmt), {
        entityId: documentId,
        ...(a.params ?? {}),
      });
    } else {
      throw new TagParseError(a.message);
    }
  }

  public async removeTagFromDocument(
    documentId: string,
    tag: Tag | MetaTag,
  ): Promise<void> {
    const a = await this.sqlBuilder.buildRemoveTagFromEntityQuery(tag);
    if (a.success) {
      await this.dbService.none(buildQueryFromDeleteStatement(a.stmt), {
        entityId: documentId,
        ...(a.params ?? {}),
      });
    } else {
      throw new TagParseError(a.message);
    }
  }

  public async getTagsForDocument(documentId: string): Promise<ApiTag[]> {
    const sql = this.sqlBuilder.buildListEntityTagsQuery();
    if (sql.success) {
      const rows = await this.dbService.any(
        tagRowSchema,
        buildQueryFromSelectStatement(sql.stmt),
        { entityId: documentId },
      );
      return rows.map((row) => ({
        key: row.key,
        value: row.value ?? undefined,
        type: row.type,
      }));
    } else {
      throw new TagParseError(sql.message);
    }
  }

  public async deleteTag(key: string, value: string): Promise<void> {
    await this.dbService.none(
      `DELETE FROM userdata_tags WHERE tag_id = (SELECT id FROM tags WHERE key = $key AND value = $value)`,
      { key, value },
    );
    await this.dbService.none(
      `DELETE FROM tags WHERE key = $key AND value = $value`,
      { key, value },
    );
    await this.tagCache.onTagDeleted({ key, value } as Tag);
  }

  public async enumerateTags() {
    const rows = await this.dbService.any(tagRowSchema, `SELECT * FROM tags`);
    return rows;
  }

  public async bulkEditDocuments(
    documentIds: string[],
    tagsToAdd: ApiTag[],
    tagsToRemove: ApiTag[],
    scope: DocumentAccessScope = { type: "all" },
  ): Promise<void> {
    // Restrict the operation to documents the caller is actually allowed to see.
    // Without this, any holder of `tag:manage` could edit tags on arbitrary
    // documents (including other users' private documents) by id.
    const editableIds = await this.filterAccessibleDocumentIds(
      documentIds,
      scope,
    );
    if (editableIds.length === 0) {
      return;
    }

    await this.dbService.none(
      `CALL bulk_edit_documents($1::uuid[], $2::jsonb, $3::jsonb)`,
      [editableIds, JSON.stringify(tagsToAdd), JSON.stringify(tagsToRemove)],
    );
  }

  private async filterAccessibleDocumentIds(
    documentIds: string[],
    scope: DocumentAccessScope,
  ): Promise<string[]> {
    if (scope.type === "none") return [];
    if (scope.type === "all") return documentIds;
    if (documentIds.length === 0) return [];

    const scopeClause = buildScopeClause(scope);
    const params: Record<string, unknown> = { ids: documentIds };
    if (scope.type === "accessible-by") params.userId = scope.userId;

    const rows = await this.dbService.any(
      z.object({ id: z.string() }),
      `SELECT id FROM documents WHERE id = ANY($ids)${scopeClause}`,
      params,
    );
    return rows.map((r) => r.id);
  }
}
