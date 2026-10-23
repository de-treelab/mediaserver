import { describe, it, expect, beforeEach, vi } from "vitest";
import { Tag, TagParser } from "@lars_hagemann/tags";
import {
  TagSqlBuilder,
  type ResolvedCollection,
  buildFilteredEntitiesPageQuery,
  buildQueryFromInsertStatement,
  buildQueryFromDeleteStatement,
} from "../../tags/TagSqlBuilder.js";
import type { TagCache } from "../../tags/TagCache.js";

const config = {
  userdataTableName: "documents",
  userdataTableIdColumn: "id",
  userdataTableIdType: "uuid",
  userdataTableColumns: ["id", "mime"],
};

/** Fake TagCache: returns ids for known tags, throws "Tag not found" otherwise. */
const makeCache = (known: Record<string, string> = {}): TagCache =>
  ({
    tagToTagId: async (tag: { key: string; value?: string }) => {
      const key = `${tag.key}${tag.value ? `:${tag.value}` : ""}`;
      const id = known[key];
      if (!id) throw new Error(`Tag not found in cache: ${key}`);
      return id;
    },
  }) as unknown as TagCache;

describe("TagSqlBuilder (SQL injection hardening)", () => {
  let builder: TagSqlBuilder;

  beforeEach(() => {
    builder = new TagSqlBuilder(config, makeCache({ nature: "42" }));
  });

  it("binds an unknown tag key as a parameter instead of interpolating it", async () => {
    // The query parser allows single quotes in identifiers, so a key like this
    // would previously have broken out of the SQL string literal.
    const payload = "x'/**/OR/**/'1'='1";
    const filter = new TagParser(payload).parse();

    const result = await builder.buildListFilteredEntitiesQuery(filter);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const sql = buildFilteredEntitiesPageQuery(result.stmt, "first");
    // The raw payload must NOT appear in the SQL text...
    expect(sql).not.toContain(payload);
    // ...it must be a bound parameter instead.
    expect(sql).toMatch(/tags\.key = \$p\d+/);
    expect(Object.values(result.params ?? {})).toContain(payload);
  });

  it("binds a known tag id as a parameter instead of interpolating it", async () => {
    const filter = new TagParser("nature").parse();

    const result = await builder.buildListFilteredEntitiesQuery(filter);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const sql = buildFilteredEntitiesPageQuery(result.stmt, "first");
    expect(sql).toMatch(/ut\.tag_id = \$p\d+/);
    expect(sql).not.toMatch(/ut\.tag_id = '?42'?/);
    expect(Object.values(result.params ?? {})).toContain("42");
  });

  it("does not leak bind parameters between successive builds", async () => {
    const r1 = await builder.buildListFilteredEntitiesQuery(
      new TagParser("alpha'").parse(),
    );
    const r2 = await builder.buildListFilteredEntitiesQuery(
      new TagParser("beta'").parse(),
    );

    expect(r1.success && r2.success).toBe(true);
    if (!r1.success || !r2.success) return;

    expect(r1.params).toEqual({ p0: "alpha'" });
    expect(r2.params).toEqual({ p0: "beta'" });
  });

  it("binds the tag id when adding a tag to an entity", async () => {
    const result = await builder.buildAddTagToEntityQuery(new Tag("nature"));
    expect(result.success).toBe(true);
    if (!result.success) return;

    const sql = buildQueryFromInsertStatement(result.stmt);
    expect(sql).toContain("$entityId");
    expect(sql).toContain("$tagId");
    expect(sql).not.toContain("42");
    expect(result.params).toEqual({ tagId: "42" });
  });

  it("binds the tag id when removing a tag from an entity", async () => {
    const result = await builder.buildRemoveTagFromEntityQuery(
      new Tag("nature"),
    );
    expect(result.success).toBe(true);
    if (!result.success) return;

    const sql = buildQueryFromDeleteStatement(result.stmt);
    expect(sql).toContain("tag_id = $tagId");
    expect(sql).not.toContain("'42'");
    expect(result.params).toEqual({ tagId: "42" });
  });
});

describe("buildFilteredEntitiesPageQuery", () => {
  const build = async (query: string) => {
    const builder = new TagSqlBuilder(config, makeCache());
    const result = await builder.buildListFilteredEntitiesQuery(
      new TagParser(query).parse(),
    );
    if (!result.success) throw new Error(result.message);
    return result.stmt;
  };

  it("breaks ties between equal timestamps by id", async () => {
    const sql = buildFilteredEntitiesPageQuery(await build(""), "first");
    expect(sql).toContain("ORDER BY created_at DESC, id DESC");
  });

  it("compares the full sort key against the cursor", async () => {
    const desc = buildFilteredEntitiesPageQuery(await build(""), "after");
    expect(desc).toContain(
      "(created_at, id) < ($cursorTs::timestamp, $cursorId::uuid)",
    );
    const asc = buildFilteredEntitiesPageQuery(
      await build("sort:oldest"),
      "after",
    );
    expect(asc).toContain(
      "(created_at, id) > ($cursorTs::timestamp, $cursorId::uuid)",
    );
  });

  it("derives the random sort key of a cursor from its id and the seed", async () => {
    const sql = buildFilteredEntitiesPageQuery(
      await build("sort:random"),
      "before",
    );
    expect(sql).toContain(
      "(_rand, id) < (HASHTEXT($cursorId::uuid::text || $seed::text), $cursorId::uuid)",
    );
    expect(sql).not.toContain("$cursorTs");
  });
});

describe("TagSqlBuilder (collection by name)", () => {
  const STATIC_ID = "11111111-1111-1111-1111-111111111111";
  const DYNAMIC_ID = "22222222-2222-2222-2222-222222222222";
  const EMPTY_ID = "33333333-3333-3333-3333-333333333333";

  const collections: Record<string, ResolvedCollection[]> = {
    "Summer 2024": [
      {
        id: STATIC_ID,
        type: "static",
        filterExpression: `collection:${STATIC_ID}`,
      },
    ],
    Landscapes: [
      {
        id: DYNAMIC_ID,
        type: "dynamic",
        filterExpression: "nature & sort:random",
      },
    ],
    Empty: [
      {
        id: EMPTY_ID,
        type: "static",
        filterExpression: `collection:${EMPTY_ID}`,
      },
    ],
    Mixed: [
      {
        id: STATIC_ID,
        type: "static",
        filterExpression: `collection:${STATIC_ID}`,
      },
      { id: DYNAMIC_ID, type: "dynamic", filterExpression: "nature" },
    ],
    Loop: [
      { id: "loop", type: "dynamic", filterExpression: 'collection:"Loop"' },
    ],
  };

  const resolveCollections = vi.fn(
    async (name: string) => collections[name] ?? [],
  );

  const build = async (query: string, withResolver = true) => {
    const builder = new TagSqlBuilder(
      config,
      makeCache({ nature: "42", [`collection:${STATIC_ID}`]: "7" }),
    );
    return builder.buildListFilteredEntitiesQuery(
      new TagParser(query).parse(),
      withResolver ? { resolveCollections } : {},
    );
  };

  beforeEach(() => resolveCollections.mockClear());

  it("matches a static collection by its membership tag", async () => {
    const result = await build('collection:"Summer 2024"');
    if (!result.success) throw new Error(result.message);

    expect(resolveCollections).toHaveBeenCalledWith("Summer 2024");
    expect(result.stmt.filtered.having).toMatch(/ut\.tag_id = \$p\d+/);
    expect(Object.values(result.params ?? {})).toEqual(["7"]);
  });

  it("expands a dynamic collection without taking over its sort", async () => {
    const result = await build("collection:Landscapes");
    if (!result.success) throw new Error(result.message);

    expect(Object.values(result.params ?? {})).toEqual(["42"]);
    expect(result.stmt.sortBy).toBe("created_at");
  });

  it("ORs all collections sharing a name", async () => {
    const result = await build("collection:Mixed");
    if (!result.success) throw new Error(result.message);

    expect(result.stmt.filtered.having).toContain(" OR ");
    expect(Object.values(result.params ?? {})).toEqual(["7", "42"]);
  });

  it("matches nothing for unknown or empty collections", async () => {
    for (const query of ["collection:Unknown", "collection:Empty"]) {
      const result = await build(query);
      if (!result.success) throw new Error(result.message);
      expect(result.stmt.filtered.having).toBe("1=0");
    }
  });

  it("rejects collections that reference themselves", async () => {
    const result = await build("collection:Loop");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.message).toContain("references itself");
  });

  it("keeps treating UUID values as membership tags", async () => {
    const result = await build(`collection:${STATIC_ID}`);
    if (!result.success) throw new Error(result.message);

    expect(resolveCollections).not.toHaveBeenCalled();
    expect(Object.values(result.params ?? {})).toEqual(["7"]);
  });

  it("does not resolve names without a resolver", async () => {
    const result = await build('collection:"Summer 2024"', false);
    expect(result.success).toBe(false);
  });
});
