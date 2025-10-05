import { MetaTag, Tag, TagIdCache } from "@lars_hagemann/tags";
import type { DbService } from "../sql/DbService.js";
import {
  paginated,
  toPaginatedResponse,
  type PaginatedResponse,
} from "../util/PaginatedResponse.js";
import { TagParseError } from "./TagParseError.js";
import {
  buildQueryFromDeleteStatement,
  buildQueryFromInsertStatement,
  buildQueryFromSelectStatement,
  TagSqlBuilder,
} from "./TagSqlBuilder.js";
import z from "zod";

export interface ListTagsRequest {
  limit: number;
  offset: number;
  tag: Tag | MetaTag;
}

const tagRowSchema = z.object({
  id: z.number(),
  key: z.string(),
  value: z.string().nullable(),
});

const tagWithCountRowSchema = tagRowSchema.extend({
  usage_count: z.number().int(),
});

export type ApiTag = {
  key: string;
  value: string | undefined;
};

export type ApiTagWithCount = ApiTag & {
  usageCount: number;
};

export class TagRepository {
  private readonly sqlBuilder: TagSqlBuilder;

  constructor(
    private readonly dbService: DbService,
    private readonly tagIdCache: TagIdCache,
  ) {
    this.sqlBuilder = new TagSqlBuilder(
      {
        userdataTableName: "documents",
        userdataTableColumns: ["id"],
        userdataTableIdColumn: "id",
      },
      tagIdCache,
    );
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
          tagValue: request.tag instanceof MetaTag ? request.tag.value : null,
        },
      );
      return toPaginatedResponse(
        response.map((row) => ({
          key: row.key,
          value: row.value ?? undefined,
          usageCount: row.usage_count,
          __total: row.__total,
        })),
      );
    } else {
      throw new TagParseError(sql.message);
    }
  }

  public async addTags(tags: (Tag | MetaTag)[]): Promise<void> {
    let i = 1;
    const valuesStmt = tags
      .map(() => {
        return `($${i++}, $${i++})`;
      })
      .join(", ");

    const result = await this.dbService.any(
      z.object({ id: z.number() }),
      `INSERT INTO tags (key, value) VALUES ${valuesStmt} ON CONFLICT DO NOTHING RETURNING id`,
      tags
        .map((tag) =>
          tag instanceof MetaTag ? [tag.key, tag.value] : [tag.key, null],
        )
        .flat(1),
    );

    let j = 0;
    for (const row of result) {
      this.tagIdCache.onTagAdded(tags[j++]!, row.id.toString());
    }
  }

  public async addTagToDocument(
    documentId: string,
    tag: Tag | MetaTag,
  ): Promise<void> {
    const a = this.sqlBuilder.buildAddTagToEntityQuery(tag);
    if (a.success) {
      await this.dbService.none(buildQueryFromInsertStatement(a.stmt), {
        entityId: documentId,
      });
    } else {
      throw new TagParseError(a.message);
    }
  }

  public async removeTagFromDocument(
    documentId: string,
    tag: Tag | MetaTag,
  ): Promise<void> {
    const a = this.sqlBuilder.buildRemoveTagFromEntityQuery(tag);
    if (a.success) {
      await this.dbService.none(buildQueryFromDeleteStatement(a.stmt), {
        entityId: documentId,
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
      }));
    } else {
      throw new TagParseError(sql.message);
    }
  }
}
