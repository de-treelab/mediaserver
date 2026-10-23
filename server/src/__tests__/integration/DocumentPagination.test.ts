import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  TagRepository,
  type DocumentListPosition,
} from "../../tags/TagRepository.js";
import { DocumentRepository } from "../../documents/DocumentRepository.js";
import {
  decodeDocumentCursor,
  encodeDocumentCursor,
} from "../../documents/DocumentCursor.js";
import { createTestDb } from "../helpers/testDb.js";
import type { DbService } from "../../sql/DbService.js";
import type { TagCache } from "../../tags/TagCache.js";

describe("TagRepository.listDocuments pagination (integration)", () => {
  let dbService: DbService;
  let teardown: () => Promise<void>;
  let tagRepository: TagRepository;
  let documentRepository: DocumentRepository;

  const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";
  const VIEWER_USER_ID = "00000000-0000-0000-0000-000000000010";
  const docId = (n: number) =>
    `00000000-0000-0000-0000-${n.toString().padStart(12, "0")}`;

  // Documents 3, 4 and 5 share a timestamp (as if uploaded in one
  // transaction); 6 and 7 differ by a single microsecond.
  const timestamps: Record<number, string> = {
    1: "2026-01-01 10:00:00",
    2: "2026-01-02 10:00:00",
    3: "2026-01-03 10:00:00",
    4: "2026-01-03 10:00:00",
    5: "2026-01-03 10:00:00",
    6: "2026-01-04 10:00:00.000001",
    7: "2026-01-04 10:00:00.000002",
  };
  // newest first, ties broken by id descending
  const NEWEST_ORDER = [7, 6, 5, 4, 3, 2, 1].map(docId);

  const createDocument = async (
    n: number,
    createdAt: string,
    isPublic = true,
  ) => {
    await documentRepository.createDocument({
      id: docId(n),
      basePath: "/data",
      filename: `${n}.jpg`,
      friendlyName: `${n}.jpg`,
      type: "image/jpeg",
      isPublic,
      ownerId: SYSTEM_USER_ID,
      contentHash: n.toString(16).padStart(64, "0"),
      sizeBytes: 1024,
    });
    await dbService.none(
      "UPDATE documents SET created_at = $createdAt::timestamp WHERE id = $id",
      { id: docId(n), createdAt },
    );
  };

  const list = (
    position: DocumentListPosition,
    limit: number,
    query = "",
    seed?: string,
  ) =>
    tagRepository.listDocuments({
      limit,
      query,
      position,
      ...(seed !== undefined ? { seed } : {}),
    });

  // Follows nextCursor from the first page until the end of the listing.
  const walkForward = async (limit: number, query = "", seed?: string) => {
    const ids: string[] = [];
    let position: DocumentListPosition = { type: "first" };
    for (let i = 0; i < 20; i++) {
      const page = await list(position, limit, query, seed);
      expect(page.startIndex).toBe(ids.length);
      ids.push(...page.items.map((d) => d.id));
      if (!page.nextCursor) return ids;
      position = {
        type: "after",
        cursor: decodeDocumentCursor(page.nextCursor),
      };
    }
    throw new Error("pagination did not terminate");
  };

  // Follows prevCursor from the last page until the start of the listing.
  const walkBackward = async (limit: number, query = "") => {
    const ids: string[] = [];
    let position: DocumentListPosition = { type: "last" };
    for (let i = 0; i < 20; i++) {
      const page = await list(position, limit, query);
      ids.unshift(...page.items.map((d) => d.id));
      expect(page.startIndex).toBe(page.total - ids.length);
      if (!page.prevCursor) return ids;
      position = {
        type: "before",
        cursor: decodeDocumentCursor(page.prevCursor),
      };
    }
    throw new Error("pagination did not terminate");
  };

  beforeAll(async () => {
    ({ dbService, teardown } = await createTestDb());
    tagRepository = new TagRepository(dbService, {} as TagCache);
    documentRepository = new DocumentRepository(dbService);

    await dbService.none(
      "INSERT INTO users (id, external_id, name) VALUES ($id, $externalId, $name)",
      { id: VIEWER_USER_ID, externalId: "viewer", name: "Viewer" },
    );
    for (const [n, createdAt] of Object.entries(timestamps)) {
      await createDocument(Number(n), createdAt);
    }
  });

  afterAll(async () => {
    await teardown();
  });

  it("orders by created_at with the id as tiebreaker", async () => {
    const page = await list({ type: "first" }, 100);
    expect(page.items.map((d) => d.id)).toEqual(NEWEST_ORDER);
    expect(page.total).toBe(7);
    expect(page.startIndex).toBe(0);
    expect(page.prevCursor).toBeUndefined();
    expect(page.nextCursor).toBeUndefined();
  });

  it.each([1, 2, 3])(
    "visits every document exactly once walking forward (limit %i)",
    async (limit) => {
      expect(await walkForward(limit)).toEqual(NEWEST_ORDER);
    },
  );

  it.each([1, 2, 3])(
    "visits every document exactly once walking backward (limit %i)",
    async (limit) => {
      expect(await walkBackward(limit)).toEqual(NEWEST_ORDER);
    },
  );

  it("supports ascending sort", async () => {
    expect(await walkForward(2, "sort:oldest")).toEqual(
      [...NEWEST_ORDER].reverse(),
    );
  });

  it("keeps the random order stable across pages for the same seed", async () => {
    const all = await list({ type: "first" }, 100, "sort:random", "abc");
    const allIds = all.items.map((d) => d.id);
    expect([...allIds].sort()).toEqual([...NEWEST_ORDER].sort());
    expect(await walkForward(2, "sort:random", "abc")).toEqual(allIds);
    expect(all.items.map((d) => d.queryIndex)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("links neighbours across page boundaries", async () => {
    const page = await list({ type: "first" }, 2);
    expect(page.items[1]!.nextId).toBe(NEWEST_ORDER[2]);
    expect(page.items[0]!.previousId).toBeUndefined();
  });

  it("returns an empty page with the total before the first document", async () => {
    const first = await list({ type: "first" }, 1);
    const page = await list(
      { type: "before", cursor: decodeDocumentCursor(first.items[0]!.cursor!) },
      2,
    );
    expect(page.items).toEqual([]);
    expect(page.total).toBe(7);
    expect(page.startIndex).toBe(0);
  });

  it("returns an empty page with the total after the last document", async () => {
    const last = await list({ type: "last" }, 1);
    const page = await list(
      { type: "after", cursor: decodeDocumentCursor(last.items[0]!.cursor!) },
      2,
    );
    expect(page.items).toEqual([]);
    expect(page.total).toBe(7);
    expect(page.startIndex).toBe(7);
  });

  it("keeps a cursor working after its document was deleted", async () => {
    await createDocument(100, "2026-01-03 12:00:00");
    try {
      // newest first: 7, 6, 100, 5, ...
      const page = await list({ type: "first" }, 3);
      expect(page.items.map((d) => d.id)).toEqual([
        docId(7),
        docId(6),
        docId(100),
      ]);
      await dbService.none("DELETE FROM documents WHERE id = $id", {
        id: docId(100),
      });

      const next = await list(
        { type: "after", cursor: decodeDocumentCursor(page.nextCursor!) },
        2,
      );
      expect(next.items.map((d) => d.id)).toEqual(NEWEST_ORDER.slice(2, 4));
    } finally {
      await dbService.none("DELETE FROM documents WHERE id = $id", {
        id: docId(100),
      });
    }
  });

  it("respects the access scope when paginating", async () => {
    await createDocument(101, "2026-01-03 12:00:00", false);
    try {
      const scope = { type: "accessible-by" as const, userId: VIEWER_USER_ID };
      const first = await tagRepository.listDocuments({
        limit: 2,
        query: "",
        scope,
      });
      const next = await tagRepository.listDocuments({
        limit: 2,
        query: "",
        scope,
        position: {
          type: "after",
          cursor: decodeDocumentCursor(first.nextCursor!),
        },
      });
      expect(next.items.map((d) => d.id)).toEqual(NEWEST_ORDER.slice(2, 4));
      expect(next.total).toBe(7);
    } finally {
      await dbService.none("DELETE FROM documents WHERE id = $id", {
        id: docId(101),
      });
    }
  });

  describe("around", () => {
    const around = async (n: number, limit: number, query = "") =>
      (
        await list({ type: "around", documentId: docId(n) }, limit, query)
      ).items.map((d) => d.id);

    it("centers the window on the anchor", async () => {
      expect(await around(4, 5)).toEqual(NEWEST_ORDER.slice(1, 6));
    });

    it("shifts the window at the start of the listing", async () => {
      expect(await around(7, 5)).toEqual(NEWEST_ORDER.slice(0, 5));
      expect(await around(6, 5)).toEqual(NEWEST_ORDER.slice(0, 5));
    });

    it("shifts the window at the end of the listing", async () => {
      expect(await around(1, 5)).toEqual(NEWEST_ORDER.slice(2, 7));
    });

    it("returns everything when the window exceeds the listing", async () => {
      expect(await around(4, 50)).toEqual(NEWEST_ORDER);
    });

    it("works with random sort", async () => {
      const all = (
        await list({ type: "first" }, 100, "sort:random", "abc")
      ).items.map((d) => d.id);
      const anchor = all[3]!;
      const page = await list(
        { type: "around", documentId: anchor },
        3,
        "sort:random",
        "abc",
      );
      expect(page.items.map((d) => d.id)).toEqual(all.slice(2, 5));
      expect(page.startIndex).toBe(2);
    });

    it("returns an empty window for an unknown anchor", async () => {
      const page = await list({ type: "around", documentId: docId(999) }, 5);
      expect(page.items).toEqual([]);
      expect(page.total).toBe(7);
    });
  });

  describe("cursor encoding", () => {
    it("round-trips microsecond timestamps", () => {
      const cursor = { ts: "2026-01-04T10:00:00.000001", id: docId(6) };
      expect(decodeDocumentCursor(encodeDocumentCursor(cursor))).toEqual(
        cursor,
      );
    });

    it.each(["", "garbage", Buffer.from("{}").toString("base64url")])(
      "rejects malformed cursor %j",
      (cursor) => {
        expect(() => decodeDocumentCursor(cursor)).toThrow(
          expect.objectContaining({ status: 400 }),
        );
      },
    );
  });
});
