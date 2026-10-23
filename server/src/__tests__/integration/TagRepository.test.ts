import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { TagRepository } from "../../tags/TagRepository.js";
import { DocumentRepository } from "../../documents/DocumentRepository.js";
import { createTestDb } from "../helpers/testDb.js";
import type { DbService } from "../../sql/DbService.js";
import type { TagCache } from "../../tags/TagCache.js";
import type { Tag, MetaTag } from "@lars_hagemann/tags";

/** In-memory replacement for TagCache (no Redis required in tests) */
const makeInMemoryTagCache = (): TagCache => {
  const store = new Map<string, string>();
  return {
    init: async (tags: { tag: Tag | MetaTag; tagId: string }[]) => {
      for (const { tag, tagId } of tags) {
        const key = `${tag.key}${"value" in tag && tag.value ? `:${tag.value}` : ""}`;
        store.set(`tag:${key}`, tagId);
      }
    },
    tagToTagId: async (tag: Tag | MetaTag) => {
      const key = `tag:${tag.key}${"value" in tag && tag.value ? `:${tag.value}` : ""}`;
      const id = store.get(key);
      if (!id) throw new Error(`Tag not found in cache: ${tag.key}`);
      return id;
    },
    onTagAdded: async (tag: Tag | MetaTag, tagId: string) => {
      const key = `tag:${tag.key}${"value" in tag && tag.value ? `:${tag.value}` : ""}`;
      store.set(key, tagId);
    },
    onTagDeleted: async (tag: Tag | MetaTag) => {
      const key = `tag:${tag.key}${"value" in tag && tag.value ? `:${tag.value}` : ""}`;
      store.delete(key);
    },
  } as unknown as TagCache;
};

describe("TagRepository (integration)", () => {
  let dbService: DbService;
  let teardown: () => Promise<void>;
  let tagRepository: TagRepository;
  let documentRepository: DocumentRepository;
  let tagCache: TagCache;

  const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";
  const DOC_ID_1 = "00000000-0000-0000-0000-000000000001";
  const DOC_ID_2 = "00000000-0000-0000-0000-000000000002";

  // Users for access scope tests
  const VIEWER_USER_ID = "00000000-0000-0000-0000-000000000010";
  const FOREIGN_OWNER_ID = "00000000-0000-0000-0000-000000000011";

  // Documents for access scope tests
  const DOC_PUBLIC = "00000000-0000-0000-0000-000000000020";
  const DOC_VIEWER_PRIVATE = "00000000-0000-0000-0000-000000000021";
  const DOC_FOREIGN_PRIVATE = "00000000-0000-0000-0000-000000000022";
  const DOC_SHARED_WITH_VIEWER = "00000000-0000-0000-0000-000000000023";

  beforeAll(async () => {
    ({ dbService, teardown } = await createTestDb());
    tagCache = makeInMemoryTagCache();
    tagRepository = new TagRepository(dbService, tagCache);
    documentRepository = new DocumentRepository(dbService);

    // Seed extra users for access scope tests
    await dbService.none(
      "INSERT INTO users (id, external_id, name) VALUES ($id, $externalId, $name)",
      { id: VIEWER_USER_ID, externalId: "viewer", name: "Viewer" },
    );
    await dbService.none(
      "INSERT INTO users (id, external_id, name) VALUES ($id, $externalId, $name)",
      { id: FOREIGN_OWNER_ID, externalId: "foreign", name: "Foreign Owner" },
    );

    // Seed documents used across tag tests
    await documentRepository.createDocument({
      id: DOC_ID_1,
      basePath: "/data",
      filename: "photo.jpg",
      friendlyName: "photo.jpg",
      type: "image/jpeg",
      isPublic: true,
      ownerId: SYSTEM_USER_ID,
      contentHash:
        "0000000000000000000000000000000000000000000000000000000000000001",
      sizeBytes: 1024,
    });
    await documentRepository.createDocument({
      id: DOC_ID_2,
      basePath: "/data",
      filename: "video.mp4",
      friendlyName: "video.mp4",
      type: "video/mp4",
      isPublic: true,
      ownerId: SYSTEM_USER_ID,
      contentHash:
        "0000000000000000000000000000000000000000000000000000000000000002",
      sizeBytes: 1024,
    });

    // Seed documents for access scope tests
    await documentRepository.createDocument({
      id: DOC_PUBLIC,
      basePath: "/data",
      filename: "public.jpg",
      friendlyName: "public.jpg",
      type: "image/jpeg",
      isPublic: true,
      ownerId: FOREIGN_OWNER_ID,
      contentHash:
        "0000000000000000000000000000000000000000000000000000000000000003",
      sizeBytes: 1024,
    });
    await documentRepository.createDocument({
      id: DOC_VIEWER_PRIVATE,
      basePath: "/data",
      filename: "viewer-private.jpg",
      friendlyName: "viewer-private.jpg",
      type: "image/jpeg",
      isPublic: false,
      ownerId: VIEWER_USER_ID,
      contentHash:
        "0000000000000000000000000000000000000000000000000000000000000004",
      sizeBytes: 1024,
    });
    await documentRepository.createDocument({
      id: DOC_FOREIGN_PRIVATE,
      basePath: "/data",
      filename: "foreign-private.jpg",
      friendlyName: "foreign-private.jpg",
      type: "image/jpeg",
      isPublic: false,
      ownerId: FOREIGN_OWNER_ID,
      contentHash:
        "0000000000000000000000000000000000000000000000000000000000000005",
      sizeBytes: 1024,
    });
    await documentRepository.createDocument({
      id: DOC_SHARED_WITH_VIEWER,
      basePath: "/data",
      filename: "shared.jpg",
      friendlyName: "shared.jpg",
      type: "image/jpeg",
      isPublic: false,
      ownerId: FOREIGN_OWNER_ID,
      contentHash:
        "0000000000000000000000000000000000000000000000000000000000000006",
      sizeBytes: 1024,
    });
    await dbService.none(
      "INSERT INTO document_shares (document_id, shared_with_user_id) VALUES ($docId, $userId)",
      { docId: DOC_SHARED_WITH_VIEWER, userId: VIEWER_USER_ID },
    );
  });

  afterAll(async () => {
    await teardown();
  });

  describe("addTags", () => {
    it("inserts tags without error", async () => {
      await expect(
        tagRepository.addTags([
          { key: "nature", value: undefined, type: "default" },
          { key: "uploaded", value: "01.01.2025", type: "meta" },
        ]),
      ).resolves.toBeUndefined();
    });

    it("is idempotent (ON CONFLICT DO NOTHING)", async () => {
      await expect(
        tagRepository.addTags([
          { key: "nature", value: undefined, type: "default" },
        ]),
      ).resolves.toBeUndefined();
    });
  });

  describe("addTagToDocument / getTagsForDocument", () => {
    it("adds a tag and retrieves it for a document", async () => {
      await tagRepository.addTags([
        { key: "landscape", value: undefined, type: "default" },
      ]);
      await tagRepository.addTagToDocument(DOC_ID_1, {
        key: "landscape",
        value: undefined,
        type: "default",
      });

      const tags = await tagRepository.getTagsForDocument(DOC_ID_1);
      expect(tags.some((t) => t.key === "landscape")).toBe(true);
    });
  });

  describe("removeTagFromDocument", () => {
    it("removes a tag from a document", async () => {
      await tagRepository.addTags([
        { key: "removable", value: undefined, type: "default" },
      ]);
      await tagRepository.addTagToDocument(DOC_ID_2, {
        key: "removable",
        value: undefined,
        type: "default",
      });

      await tagRepository.removeTagFromDocument(DOC_ID_2, {
        key: "removable",
      } as Tag);

      const tags = await tagRepository.getTagsForDocument(DOC_ID_2);
      expect(tags.some((t) => t.key === "removable")).toBe(false);
    });
  });

  describe("listTags", () => {
    it("returns tags with usage count", async () => {
      const result = await tagRepository.listTags({
        limit: 100,
        offset: 0,
        tag: { key: "", value: undefined, type: "default" },
      });

      expect(result.total).toBeGreaterThan(0);
      expect(result.items.every((t) => typeof t.usageCount === "number")).toBe(
        true,
      );
    });

    it("respects limit and offset", async () => {
      const page1 = await tagRepository.listTags({
        limit: 1,
        offset: 0,
        tag: { key: "", value: undefined, type: "default" },
      });
      expect(page1.items).toHaveLength(1);
    });
  });

  describe("listDocuments", () => {
    it("returns documents matching a tag query", async () => {
      const result = await tagRepository.listDocuments({
        limit: 100,
        query: "landscape",
      });

      expect(result.items.some((d) => d.id === DOC_ID_1)).toBe(true);
    });

    it("returns empty result for unmatched query", async () => {
      const result = await tagRepository.listDocuments({
        limit: 100,
        query: "nonexistent-tag-xyz",
      });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("returns all documents when query is empty", async () => {
      const result = await tagRepository.listDocuments({
        limit: 100,
        query: "",
      });

      expect(result.items.length).toBeGreaterThanOrEqual(2);
    });

    it("treats a SQL-injection payload as a literal tag key (no injection)", async () => {
      // The query language permits quotes and `/**/` in identifiers. Before the
      // fix this interpolated into `tags.key = '...'` and the `OR '1'='1'` would
      // have matched every tagged document. With bound parameters it is just a
      // literal key that matches nothing.
      const result = await tagRepository.listDocuments({
        limit: 100,
        query: "x'/**/OR/**/'1'='1",
      });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe("listDocuments — boolean filters", () => {
    const ALL_DOCS = [
      DOC_ID_1,
      DOC_ID_2,
      DOC_PUBLIC,
      DOC_VIEWER_PRIVATE,
      DOC_FOREIGN_PRIVATE,
      DOC_SHARED_WITH_VIEWER,
    ];

    const ids = async (query: string) => {
      const result = await tagRepository.listDocuments({ limit: 100, query });
      expect(result.total).toBe(result.items.length);
      return result.items.map((d) => d.id).sort();
    };

    beforeAll(async () => {
      const tags = [
        { key: "bool-a", value: undefined, type: "default" },
        { key: "bool-b", value: undefined, type: "default" },
        { key: "bool-person", value: "alice", type: "default" },
      ];
      await tagRepository.addTags(tags);
      await tagRepository.addTagToDocument(DOC_ID_1, tags[0]!);
      await tagRepository.addTagToDocument(DOC_ID_1, tags[1]!);
      await tagRepository.addTagToDocument(DOC_ID_2, tags[1]!);
      await tagRepository.addTagToDocument(DOC_ID_2, tags[2]!);
    });

    it("matches documents without any tags under a negation", async () => {
      expect(await ids("!bool-a")).toEqual(
        ALL_DOCS.filter((id) => id !== DOC_ID_1).sort(),
      );
    });

    it("combines conjunctions with negations", async () => {
      expect(await ids("bool-b & !bool-a")).toEqual([DOC_ID_2]);
    });

    it("lists documents matching several alternatives once", async () => {
      expect(await ids("bool-a | bool-b")).toEqual([DOC_ID_1, DOC_ID_2]);
    });

    it("matches a key regardless of its value", async () => {
      expect(await ids("bool-person")).toEqual([DOC_ID_2]);
    });

    it("applies the access scope on top of the filter", async () => {
      const result = await tagRepository.listDocuments({
        limit: 100,
        query: "!bool-a",
        scope: { type: "accessible-by", userId: VIEWER_USER_ID },
      });
      expect(result.items.map((d) => d.id).sort()).toEqual(
        [
          DOC_ID_2,
          DOC_PUBLIC,
          DOC_VIEWER_PRIVATE,
          DOC_SHARED_WITH_VIEWER,
        ].sort(),
      );
      expect(result.total).toBe(4);
    });
  });

  describe("listDocuments — collection by name", () => {
    const STATIC_COLLECTION_ID = "00000000-0000-0000-0000-000000000030";

    const resolveCollections = async (name: string) =>
      ({
        "Summer 2024": [
          {
            id: STATIC_COLLECTION_ID,
            type: "static" as const,
            filterExpression: `collection:${STATIC_COLLECTION_ID}`,
          },
        ],
        "Not Summer": [
          {
            id: "dynamic",
            type: "dynamic" as const,
            filterExpression: 'landscape & !collection:"Summer 2024"',
          },
        ],
      })[name] ?? [];

    beforeAll(async () => {
      const membership = {
        key: "collection",
        value: STATIC_COLLECTION_ID,
        type: "collection",
      };
      await tagRepository.addTags([
        membership,
        { key: "landscape", value: undefined, type: "default" },
      ]);
      await tagRepository.addTagToDocument(DOC_ID_2, membership);
      await tagRepository.addTagToDocument(DOC_ID_1, {
        key: "landscape",
        value: undefined,
        type: "default",
      });
    });

    const ids = async (query: string) =>
      (
        await tagRepository.listDocuments({
          limit: 100,
          query,
          resolveCollections,
        })
      ).items.map((d) => d.id);

    it("matches the members of a static collection", async () => {
      expect(await ids('collection:"Summer 2024"')).toEqual([DOC_ID_2]);
    });

    it("expands dynamic collections, including nested names", async () => {
      expect(await ids('collection:"Not Summer"')).toEqual([DOC_ID_1]);
    });

    it("matches nothing for an unknown collection", async () => {
      expect(await ids("collection:Unknown")).toEqual([]);
    });
  });

  describe("bulkEditDocuments — access scope", () => {
    const viewerScope = {
      type: "accessible-by" as const,
      userId: VIEWER_USER_ID,
    };

    it("does not edit tags on documents outside the caller's scope", async () => {
      await tagRepository.bulkEditDocuments(
        [DOC_FOREIGN_PRIVATE],
        [{ key: "hacked", value: undefined, type: "default" }],
        [],
        viewerScope,
      );

      const tags = await tagRepository.getTagsForDocument(DOC_FOREIGN_PRIVATE);
      expect(tags.some((t) => t.key === "hacked")).toBe(false);
    });

    it("edits tags on documents within the caller's scope", async () => {
      await tagRepository.bulkEditDocuments(
        [DOC_VIEWER_PRIVATE],
        [{ key: "mine", value: undefined, type: "default" }],
        [],
        viewerScope,
      );

      const tags = await tagRepository.getTagsForDocument(DOC_VIEWER_PRIVATE);
      expect(tags.some((t) => t.key === "mine")).toBe(true);
    });

    it("removes tags without a value", async () => {
      const tag = { key: "valueless", value: undefined, type: "default" };
      await tagRepository.bulkEditDocuments([DOC_ID_2], [tag], []);
      expect(
        (await tagRepository.getTagsForDocument(DOC_ID_2)).some(
          (t) => t.key === "valueless",
        ),
      ).toBe(true);

      await tagRepository.bulkEditDocuments([DOC_ID_2], [], [tag]);
      expect(
        (await tagRepository.getTagsForDocument(DOC_ID_2)).some(
          (t) => t.key === "valueless",
        ),
      ).toBe(false);
    });

    it("removes tags with a value", async () => {
      const tag = { key: "rating", value: "5", type: "default" };
      await tagRepository.bulkEditDocuments([DOC_ID_2], [tag], []);
      await tagRepository.bulkEditDocuments([DOC_ID_2], [], [tag]);
      expect(
        (await tagRepository.getTagsForDocument(DOC_ID_2)).some(
          (t) => t.key === "rating",
        ),
      ).toBe(false);
    });
  });

  describe("resolveSelection / countTagsOfDocuments", () => {
    const viewerScope = {
      type: "accessible-by" as const,
      userId: VIEWER_USER_ID,
    };
    const selected = [DOC_PUBLIC, DOC_VIEWER_PRIVATE, DOC_FOREIGN_PRIVATE];

    beforeAll(async () => {
      await tagRepository.addTags([
        { key: "selection-a", value: undefined, type: "default" },
        { key: "selection-b", value: undefined, type: "default" },
      ]);
      for (const id of selected) {
        await tagRepository.addTagToDocument(id, {
          key: "selection-a",
          value: undefined,
          type: "default",
        });
      }
      await tagRepository.addTagToDocument(DOC_PUBLIC, {
        key: "selection-b",
        value: undefined,
        type: "default",
      });
    });

    it("selects every document matching the query", async () => {
      const ids = await tagRepository.resolveSelection({
        type: "query",
        query: "selection-a",
        excludedIds: [],
      });
      expect(ids.sort()).toEqual([...selected].sort());
    });

    it("leaves out excluded documents", async () => {
      const ids = await tagRepository.resolveSelection({
        type: "query",
        query: "selection-a",
        excludedIds: [DOC_PUBLIC],
      });
      expect(ids.sort()).toEqual(
        [DOC_VIEWER_PRIVATE, DOC_FOREIGN_PRIVATE].sort(),
      );
    });

    it("selects only matching documents within the caller's scope", async () => {
      const ids = await tagRepository.resolveSelection(
        { type: "query", query: "selection-a", excludedIds: [] },
        viewerScope,
      );
      expect(ids.sort()).toEqual([DOC_PUBLIC, DOC_VIEWER_PRIVATE].sort());
    });

    it("drops selected ids outside the caller's scope", async () => {
      const ids = await tagRepository.resolveSelection(
        { type: "ids", ids: selected },
        viewerScope,
      );
      expect(ids.sort()).toEqual([DOC_PUBLIC, DOC_VIEWER_PRIVATE].sort());
    });

    it("counts the documents carrying each tag", async () => {
      const tags = await tagRepository.countTagsOfDocuments(selected);
      const count = (key: string) =>
        tags.find((tag) => tag.key === key)?.usageCount;
      expect(count("selection-a")).toBe(3);
      expect(count("selection-b")).toBe(1);
    });

    it("counts nothing for an empty selection", async () => {
      expect(await tagRepository.countTagsOfDocuments([])).toEqual([]);
    });
  });

  describe("deleteTag", () => {
    it("removes tag and its document associations", async () => {
      await tagRepository.addTags([
        { key: "to-delete", value: "yes", type: "default" },
      ]);
      await tagRepository.addTagToDocument(DOC_ID_1, {
        key: "to-delete",
        value: "yes",
        type: "default",
      });

      await tagRepository.deleteTag("to-delete", "yes");

      const tags = await tagRepository.getTagsForDocument(DOC_ID_1);
      expect(tags.some((t) => t.key === "to-delete")).toBe(false);
    });
  });

  describe("enumerateTags", () => {
    it("returns all tags in the database", async () => {
      const tags = await tagRepository.enumerateTags();

      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBeGreaterThan(0);
      expect(tags[0]).toMatchObject({
        id: expect.any(Number),
        key: expect.any(String),
      });
    });
  });

  describe("listDocuments — document access scope", () => {
    const scope = (userId: string) => ({
      type: "accessible-by" as const,
      userId,
    });

    it("viewer can see public documents", async () => {
      const result = await tagRepository.listDocuments({
        limit: 100,
        query: "",
        scope: scope(VIEWER_USER_ID),
      });
      const ids = result.items.map((d) => d.id);
      expect(ids).toContain(DOC_PUBLIC);
    });

    it("viewer can see their own private documents", async () => {
      const result = await tagRepository.listDocuments({
        limit: 100,
        query: "",
        scope: scope(VIEWER_USER_ID),
      });
      const ids = result.items.map((d) => d.id);
      expect(ids).toContain(DOC_VIEWER_PRIVATE);
    });

    it("viewer cannot see foreign private documents", async () => {
      const result = await tagRepository.listDocuments({
        limit: 100,
        query: "",
        scope: scope(VIEWER_USER_ID),
      });
      const ids = result.items.map((d) => d.id);
      expect(ids).not.toContain(DOC_FOREIGN_PRIVATE);
    });

    it("viewer can see documents shared with them", async () => {
      const result = await tagRepository.listDocuments({
        limit: 100,
        query: "",
        scope: scope(VIEWER_USER_ID),
      });
      const ids = result.items.map((d) => d.id);
      expect(ids).toContain(DOC_SHARED_WITH_VIEWER);
    });
  });

  describe("listDocuments — shared:me", () => {
    it("lists only the documents shared with the current user", async () => {
      const result = await tagRepository.listDocuments({
        limit: 100,
        query: "shared:me",
        scope: { type: "accessible-by", userId: VIEWER_USER_ID },
        currentUserId: VIEWER_USER_ID,
      });
      expect(result.items.map((d) => d.id)).toEqual([DOC_SHARED_WITH_VIEWER]);
      expect(result.total).toBe(1);
    });

    it("combines with other filters", async () => {
      const result = await tagRepository.listDocuments({
        limit: 100,
        query: "!shared:me",
        scope: { type: "accessible-by", userId: VIEWER_USER_ID },
        currentUserId: VIEWER_USER_ID,
      });
      const ids = result.items.map((d) => d.id);
      expect(ids).not.toContain(DOC_SHARED_WITH_VIEWER);
      expect(ids).toContain(DOC_VIEWER_PRIVATE);
    });

    it("matches nothing without a current user", async () => {
      const result = await tagRepository.listDocuments({
        limit: 100,
        query: "shared:me",
      });
      expect(result.items).toEqual([]);
    });
  });
});
