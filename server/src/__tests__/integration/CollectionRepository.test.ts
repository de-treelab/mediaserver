import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { CollectionRepository } from "../../collections/CollectionRepository.js";
import { createTestDb } from "../helpers/testDb.js";
import type { DbService } from "../../sql/DbService.js";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";

const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

describe("CollectionRepository (integration)", () => {
  let container: StartedPostgreSqlContainer;
  let dbService: DbService;
  let teardown: () => Promise<void>;
  let repository: CollectionRepository;

  beforeAll(async () => {
    ({ container, dbService, teardown } = await createTestDb());
    repository = new CollectionRepository(dbService);
  });

  afterAll(async () => {
    await teardown();
  });

  const baseRequest = {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Test Collection",
    filterExpression: "nature",
    isFavorite: false,
    type: "dynamic" as const,
    ownerId: SYSTEM_USER_ID,
    isPublic: true,
  };

  const allScope = { type: "all" as const };

  describe("createCollection", () => {
    it("creates and returns a collection", async () => {
      const result = await repository.createCollection(baseRequest);

      expect(result).toMatchObject({
        id: baseRequest.id,
        name: "Test Collection",
        filterExpression: "nature",
        isFavorite: false,
        type: "dynamic",
        ownerId: SYSTEM_USER_ID,
        isPublic: true,
      });
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it("stores description when provided", async () => {
      const result = await repository.createCollection({
        id: "00000000-0000-0000-0000-000000000002",
        name: "With Description",
        description: "A test description",
        filterExpression: "nature",
        isFavorite: true,
        type: "dynamic",
        ownerId: SYSTEM_USER_ID,
        isPublic: true,
      });

      expect(result.description).toBe("A test description");
      expect(result.isFavorite).toBe(true);
    });
  });

  describe("getCollection", () => {
    it("returns the collection by id", async () => {
      const result = await repository.getCollection(baseRequest.id);

      expect(result).toMatchObject({ id: baseRequest.id, name: "Test Collection" });
    });

    it("returns null for unknown id", async () => {
      const result = await repository.getCollection("00000000-0000-0000-0000-999999999999");

      expect(result).toBeNull();
    });

    it("returns null when scope excludes the collection", async () => {
      const result = await repository.getCollection(baseRequest.id, { type: "none" });

      expect(result).toBeNull();
    });
  });

  describe("listCollections", () => {
    it("returns all collections with total", async () => {
      const result = await repository.listCollections({ limit: 100, offset: 0, type: undefined, scope: allScope });

      expect(result.total).toBeGreaterThanOrEqual(2);
      expect(result.items.length).toBeGreaterThanOrEqual(2);
    });

    it("filters by type", async () => {
      const result = await repository.listCollections({
        limit: 100,
        offset: 0,
        type: "dynamic",
        scope: allScope,
      });

      expect(result.items.every((c) => c.type === "dynamic")).toBe(true);
    });

    it("respects limit and offset", async () => {
      const page1 = await repository.listCollections({ limit: 1, offset: 0, type: undefined, scope: allScope });
      const page2 = await repository.listCollections({ limit: 1, offset: 1, type: undefined, scope: allScope });

      expect(page1.items).toHaveLength(1);
      expect(page2.items).toHaveLength(1);
      expect(page1.items[0]!.id).not.toBe(page2.items[0]!.id);
    });

    it("hides private collections from other users", async () => {
      await repository.createCollection({
        id: "00000000-0000-0000-0000-000000000004",
        name: "Private Collection",
        filterExpression: "secret",
        isFavorite: false,
        type: "dynamic",
        ownerId: SYSTEM_USER_ID,
        isPublic: false,
      });

      const otherUserId = "00000000-0000-0000-0000-000000000099";
      const result = await repository.listCollections({
        limit: 100,
        offset: 0,
        type: undefined,
        scope: { type: "accessible-by", userId: otherUserId },
      });

      expect(result.items.every((c) => c.id !== "00000000-0000-0000-0000-000000000004")).toBe(true);
    });

    it("shows private collections to their owner", async () => {
      const result = await repository.listCollections({
        limit: 100,
        offset: 0,
        type: undefined,
        scope: { type: "accessible-by", userId: SYSTEM_USER_ID },
      });

      const found = result.items.find((c) => c.id === "00000000-0000-0000-0000-000000000004");
      expect(found).toBeDefined();
    });
  });

  describe("collection names", () => {
    const OTHER_USER_ID = "00000000-0000-0000-0000-000000000098";
    const ids = {
      systemPublic: "00000000-0000-0000-0000-000000000010",
      systemPrivate: "00000000-0000-0000-0000-000000000011",
      other: "00000000-0000-0000-0000-000000000012",
    };

    beforeAll(async () => {
      await dbService.none(
        "INSERT INTO users (id, external_id, name) VALUES ($id, $externalId, $name)",
        { id: OTHER_USER_ID, externalId: "other-names", name: "Other" },
      );
      await repository.createCollection({
        ...baseRequest,
        id: ids.systemPublic,
        name: "Summer 2024",
      });
      await repository.createCollection({
        ...baseRequest,
        id: ids.systemPrivate,
        name: "summer 2024",
        isPublic: false,
      });
      await repository.createCollection({
        ...baseRequest,
        id: ids.other,
        name: "Summer 2024",
        ownerId: OTHER_USER_ID,
      });
    });

    it("lists collections whose name contains the filter", async () => {
      const result = await repository.listCollections({
        limit: 100,
        offset: 0,
        type: undefined,
        name: "MMER 20",
        scope: allScope,
      });

      expect(result.items.map((c) => c.id).sort()).toEqual(
        Object.values(ids).sort(),
      );
    });

    it("matches wildcard characters in the name filter literally", async () => {
      const result = await repository.listCollections({
        limit: 100,
        offset: 0,
        type: undefined,
        name: "%",
        scope: allScope,
      });

      expect(result.items).toHaveLength(0);
    });

    it("finds collections by exact name, ignoring case", async () => {
      const result = await repository.findCollectionsByName(
        "SUMMER 2024",
        allScope,
      );

      expect(result.map((c) => c.id).sort()).toEqual(Object.values(ids).sort());
      expect(
        await repository.findCollectionsByName("Summer", allScope),
      ).toEqual([]);
    });

    it("prefers the user's own collections", async () => {
      const result = await repository.findCollectionsByName("Summer 2024", {
        type: "accessible-by",
        userId: OTHER_USER_ID,
      });

      expect(result.map((c) => c.id)).toEqual([ids.other]);
    });

    it("only finds collections visible to the user", async () => {
      const result = await repository.findCollectionsByName("Summer 2024", {
        type: "public-only",
      });

      expect(result.map((c) => c.id).sort()).toEqual(
        [ids.systemPublic, ids.other].sort(),
      );
    });
  });

  describe("updateCollection", () => {
    it("updates and returns the modified collection", async () => {
      const result = await repository.updateCollection({
        id: baseRequest.id,
        name: "Updated Name",
        description: "New desc",
        filterExpression: "updated",
        isFavorite: true,
      });

      expect(result).toMatchObject({
        id: baseRequest.id,
        name: "Updated Name",
        description: "New desc",
        filterExpression: "updated",
        isFavorite: true,
      });
    });

    it("returns null for unknown id", async () => {
      const result = await repository.updateCollection({
        id: "00000000-0000-0000-0000-999999999999",
        name: "Unknown",
        description: null,
        filterExpression: "x",
        isFavorite: false,
      });

      expect(result).toBeNull();
    });
  });

  describe("deleteCollection", () => {
    it("removes the collection", async () => {
      const toDelete = await repository.createCollection({
        id: "00000000-0000-0000-0000-000000000003",
        name: "To Delete",
        filterExpression: "x",
        isFavorite: false,
        type: "dynamic",
        ownerId: SYSTEM_USER_ID,
        isPublic: true,
      });

      await repository.deleteCollection(toDelete.id);

      const result = await repository.getCollection(toDelete.id);
      expect(result).toBeNull();
    });

    it("does not throw when deleting non-existent id", async () => {
      await expect(
        repository.deleteCollection("00000000-0000-0000-0000-999999999998"),
      ).resolves.toBeUndefined();
    });
  });

  describe("getCollectionAccess", () => {
    it("returns access info for a collection", async () => {
      const access = await repository.getCollectionAccess(baseRequest.id);

      expect(access.ownerId).toBe(SYSTEM_USER_ID);
      expect(access.isPublic).toBe(true);
      expect(access.shares).toEqual([]);
    });

    it("throws NotFound for unknown collection", async () => {
      await expect(
        repository.getCollectionAccess("00000000-0000-0000-0000-999999999999"),
      ).rejects.toMatchObject({ name: "NotFound" });
    });
  });

  describe("updateCollectionAccess", () => {
    it("updates isPublic", async () => {
      await repository.updateCollectionAccess(baseRequest.id, {
        isPublic: false,
        sharedWith: [],
      });

      const access = await repository.getCollectionAccess(baseRequest.id);
      expect(access.isPublic).toBe(false);
    });

    it("restores isPublic", async () => {
      await repository.updateCollectionAccess(baseRequest.id, {
        isPublic: true,
        sharedWith: [],
      });

      const access = await repository.getCollectionAccess(baseRequest.id);
      expect(access.isPublic).toBe(true);
    });
  });
});
