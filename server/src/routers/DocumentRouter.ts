import { Router } from "express";
import { apiHandler, FileDownload, FileStream } from "../ApiHandler.js";
import { ApiError } from "../common/ApiError.js";
import { services } from "../DefaultDiContainer.js";
import type { EmptyObject } from "../common/EmptyObject.js";
import type { DocumentService } from "../documents/DocumentService.js";
import type { DocumentAccess } from "../documents/DocumentRepository.js";
import type {
  CursorPaginatedResponse,
  PaginatedResponse,
} from "../util/PaginatedResponse.js";
import { decodeDocumentCursor } from "../documents/DocumentCursor.js";
import type {
  Document,
  DocumentWithTags,
} from "../documents/DocumentRepository.js";
import { TagService, type SelectionTags } from "../tags/TagService.js";
import type { AccessScopeResolver } from "../auth/AccessScopeResolver.js";
import z from "zod";
import type { UploadService } from "../files/UploadService.js";
import { isValidExtension } from "../files/FileService.js";
import type {
  ApiTag,
  DocumentListPosition,
  DocumentSelection,
} from "../tags/TagRepository.js";
import { requirePermission } from "../auth/requirePermission.js";
import { SYSTEM_USER_ID } from "../auth/Identity.js";
import type { DuplicateGroup } from "../duplicates/DuplicateRepository.js";
import type {
  DuplicateService,
  IndexingStatus,
  ResolveDuplicateGroupRequest,
  ResolveDuplicateGroupResult,
} from "../duplicates/DuplicateService.js";

export const documentRouter = Router();

type DocumentUpload = {
  tags: string;
  isPublic: string;
  friendlyName?: string;
};

const documentSelectionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ids"), ids: z.array(z.string()) }),
  z.object({
    type: z.literal("query"),
    query: z.string(),
    excludedIds: z.array(z.string()),
  }),
]);

const parseSelection = (value: unknown): DocumentSelection => {
  const result = documentSelectionSchema.safeParse(value);
  if (!result.success) {
    throw new ApiError("BadRequest", 400, "Invalid document selection");
  }
  return result.data;
};

type BulkEditDocumentsRequest = {
  // Either of them; `documentIds` is kept for existing clients
  documentIds?: string[];
  selection?: DocumentSelection;
  tagsToAdd: ApiTag[];
  tagsToRemove: ApiTag[];
};

type UpdateDocumentAccessRequest = {
  isPublic: boolean;
  sharedWith: string[];
};

documentRouter.post(
  "/upload",
  requirePermission("document:upload"),
  apiHandler<
    EmptyObject,
    { webSocketClientId: string; extension: string },
    DocumentUpload
  >(
    async ({
      diContainer,
      files,
      query: { webSocketClientId, extension },
      body: { tags, isPublic, friendlyName },
      identity,
    }) => {
      const file = files?.upload;
      if (!file || Array.isArray(file)) {
        throw new ApiError(
          "BadRequest",
          400,
          "None or more than one file uploaded",
        );
      }

      if (!webSocketClientId) {
        throw new ApiError("BadRequest", 400, "Missing webSocketClientId");
      }

      if (!extension) {
        throw new ApiError("BadRequest", 400, "Missing extension");
      }

      if (!isValidExtension(extension)) {
        throw new ApiError("BadRequest", 400, "Invalid extension");
      }

      const parsedTags = z
        .array(
          z.object({
            key: z.string(),
            value: z.string().or(z.undefined()),
            type: z.string(),
          }),
        )
        .parse(JSON.parse(tags));
      for (const tag of parsedTags) {
        TagService.assertSingleTag(TagService.toString(tag));
      }

      const ownerId =
        identity.userId === "system" || identity.userId === null
          ? SYSTEM_USER_ID
          : identity.userId;

      const uploadService = diContainer.get<UploadService>(services.upload);
      void uploadService.processUploadDocument({
        name: file.name,
        file: file.tempFilePath,
        size: file.size,
        mimeType: file.mimetype,
        webSocketClientId: decodeURIComponent(webSocketClientId),
        extension,
        ownerId,
        isPublic: isPublic === "true",
        friendlyName: friendlyName ?? file.name,
        tags: parsedTags,
      });

      return {
        status: 204,
        body: {},
      };
    },
  ),
);

// `before=end` requests the last page of the listing.
const END_CURSOR = "end";

const parseListPosition = ({
  after,
  before,
  around,
  at,
}: {
  after: string | undefined;
  before: string | undefined;
  around: string | undefined;
  at: string | undefined;
}): DocumentListPosition => {
  if ([after, before, around, at].filter((p) => p !== undefined).length > 1) {
    throw new ApiError(
      "InvalidCursor",
      400,
      "Only one of after, before, around and at may be given",
    );
  }
  if (after !== undefined) {
    return { type: "after", cursor: decodeDocumentCursor(after) };
  }
  if (before === END_CURSOR) {
    return { type: "last" };
  }
  if (before !== undefined) {
    return { type: "before", cursor: decodeDocumentCursor(before) };
  }
  if (around !== undefined) {
    const documentId = z.guid().safeParse(around);
    if (!documentId.success) {
      throw new ApiError("InvalidCursor", 400, "Invalid document id");
    }
    return { type: "around", documentId: documentId.data.toLowerCase() };
  }
  if (at !== undefined) {
    const index = z.coerce.number().int().min(0).safeParse(at);
    if (!index.success) {
      throw new ApiError("InvalidCursor", 400, "Invalid index");
    }
    return { type: "at", index: index.data };
  }
  return { type: "first" };
};

documentRouter.get(
  "/",
  requirePermission("document:read"),
  apiHandler<
    CursorPaginatedResponse<Document>,
    {
      limit?: number;
      query?: string;
      seed?: string;
      after?: string;
      before?: string;
      around?: string;
      at?: string;
    }
  >(
    async ({
      diContainer,
      query: { limit = 100, query = "", seed, after, before, around, at },
      identity,
    }) => {
      const scopeResolver = diContainer.get<AccessScopeResolver>(
        services.accessScopeResolver,
      );
      const scope = scopeResolver.documentScope(identity);
      const tagService = diContainer.get<TagService>(services.tag);
      const response = await tagService.listDocuments(
        {
          limit,
          position: parseListPosition({ after, before, around, at }),
          query: decodeURIComponent(query),
          seed: seed ?? "",
          currentUserId: scopeResolver.currentUserId(identity),
        },
        scope,
        scopeResolver.collectionScope(identity),
      );
      return {
        status: 200,
        body: response,
      };
    },
  ),
);

documentRouter.get(
  "/by-ids",
  requirePermission("document:read"),
  apiHandler<DocumentWithTags[], { id: string | string[] }>(
    async ({ diContainer, query: { id }, identity }) => {
      const scopeResolver = diContainer.get<AccessScopeResolver>(
        services.accessScopeResolver,
      );
      const scope = scopeResolver.documentScope(identity);
      const ids = Array.isArray(id) ? id : [id];
      const tagService = diContainer.get<TagService>(services.tag);
      const response = await tagService.listDocumentsByIds(ids, scope);
      return {
        status: 200,
        body: response,
      };
    },
  ),
);

documentRouter.post(
  "/bulk-edit",
  requirePermission("tag:manage"),
  apiHandler<EmptyObject, EmptyObject, BulkEditDocumentsRequest>(
    async ({ diContainer, body, identity }) => {
      const scopeResolver = diContainer.get<AccessScopeResolver>(
        services.accessScopeResolver,
      );
      for (const tag of body.tagsToAdd) {
        TagService.assertSingleTag(TagService.toString(tag));
      }
      const selection = parseSelection(
        body.selection ?? { type: "ids", ids: body.documentIds },
      );
      const tagService = diContainer.get<TagService>(services.tag);
      await tagService.bulkEditDocuments(
        selection,
        body.tagsToAdd,
        body.tagsToRemove,
        scopeResolver.documentScope(identity),
        scopeResolver.collectionScope(identity),
        scopeResolver.currentUserId(identity),
      );
      return {
        status: 204,
        body: {},
      };
    },
  ),
);

documentRouter.post(
  "/selection/tags",
  requirePermission("document:read"),
  apiHandler<SelectionTags, EmptyObject, { selection: DocumentSelection }>(
    async ({ diContainer, body, identity }) => {
      const scopeResolver = diContainer.get<AccessScopeResolver>(
        services.accessScopeResolver,
      );
      const tagService = diContainer.get<TagService>(services.tag);
      const response = await tagService.listSelectionTags(
        parseSelection(body.selection),
        scopeResolver.documentScope(identity),
        scopeResolver.collectionScope(identity),
        scopeResolver.currentUserId(identity),
      );
      return {
        status: 200,
        body: response,
      };
    },
  ),
);

// Registered ahead of the `/:id` routes below, which would otherwise swallow
// `/duplicates` as a document id.
documentRouter.get(
  "/duplicates",
  requirePermission("document:read"),
  apiHandler<
    PaginatedResponse<DuplicateGroup>,
    { limit?: string; offset?: string }
  >(async ({ diContainer, query, identity }) => {
    const { limit, offset } = z
      .object({
        limit: z.coerce.number().int().min(1).max(100).default(20),
        offset: z.coerce.number().int().min(0).default(0),
      })
      .parse(query);

    const duplicateService = diContainer.get<DuplicateService>(
      services.duplicate,
    );
    return {
      status: 200,
      body: await duplicateService.listDuplicates(identity, { limit, offset }),
    };
  }),
);

documentRouter.get(
  "/duplicates/indexing",
  requirePermission("document:read"),
  apiHandler<IndexingStatus>(async ({ diContainer }) => {
    const duplicateService = diContainer.get<DuplicateService>(
      services.duplicate,
    );
    return { status: 200, body: await duplicateService.getIndexingStatus() };
  }),
);

// Hashing the backlog touches every store and every user's files, so it is an
// administrative action rather than something an individual user may kick off.
documentRouter.post(
  "/duplicates/indexing",
  requirePermission("admin:state"),
  apiHandler<IndexingStatus>(async ({ diContainer }) => {
    const duplicateService = diContainer.get<DuplicateService>(
      services.duplicate,
    );
    return { status: 202, body: await duplicateService.startIndexing() };
  }),
);

// No `requirePermission` for deletion here on purpose, mirroring
// `DELETE /:id`: resolving a group deletes documents, and the right to do so
// comes from owning them. DuplicateService enforces that via the owned scope.
documentRouter.post(
  "/duplicates/resolve",
  requirePermission("document:read"),
  apiHandler<
    ResolveDuplicateGroupResult,
    EmptyObject,
    ResolveDuplicateGroupRequest
  >(async ({ diContainer, body, identity }) => {
    const tagSchema = z.object({
      key: z.string().min(1),
      value: z.string().or(z.undefined()),
      type: z.string(),
    });
    const request = z
      .object({
        contentHash: z.string().length(64),
        keepId: z.string().uuid(),
        mergeIds: z.array(z.string().uuid()).min(1),
        tagsToAdd: z.array(tagSchema).default([]),
        tagsToRemove: z.array(tagSchema).default([]),
      })
      .parse(body);

    const duplicateService = diContainer.get<DuplicateService>(
      services.duplicate,
    );
    return {
      status: 200,
      body: await duplicateService.resolveDuplicateGroup(identity, request),
    };
  }),
);

documentRouter.get(
  "/:id/thumbnail",
  requirePermission("document:read"),
  apiHandler<FileDownload, EmptyObject, EmptyObject, { id: string }>(
    async ({ diContainer, params: { id }, identity }) => {
      const scopeResolver = diContainer.get<AccessScopeResolver>(
        services.accessScopeResolver,
      );
      const scope = scopeResolver.documentScope(identity);
      const documentService = diContainer.get<DocumentService>(
        services.document,
      );
      const thumbnailPath = await documentService.getDocumentThumbnail(
        id,
        scope,
      );
      return {
        status: 200,
        // Thumbnails don't change. Private, as access may be revoked: a browser
        // keeps showing a thumbnail it still has for up to a day.
        body: new FileDownload(
          thumbnailPath,
          "image/jpeg",
          "private, max-age=86400",
        ),
      };
    },
  ),
);

documentRouter.get(
  "/:id/access",
  requirePermission("document:read"),
  apiHandler<DocumentAccess, EmptyObject, EmptyObject, { id: string }>(
    async ({ diContainer, params: { id }, identity }) => {
      const documentService = diContainer.get<DocumentService>(
        services.document,
      );
      const access = await documentService.getDocumentAccess(id, identity);
      return {
        status: 200,
        body: access,
      };
    },
  ),
);

documentRouter.put(
  "/:id/access",
  requirePermission("document:read"),
  apiHandler<
    EmptyObject,
    EmptyObject,
    UpdateDocumentAccessRequest,
    { id: string }
  >(async ({ diContainer, params: { id }, body, identity }) => {
    const updateSchema = z.object({
      isPublic: z.boolean(),
      sharedWith: z.array(z.string().uuid()),
    });
    const update = updateSchema.parse(body);
    const documentService = diContainer.get<DocumentService>(services.document);
    await documentService.updateDocumentAccess(id, identity, update);
    return {
      status: 204,
      body: {},
    };
  }),
);

documentRouter.patch(
  "/:id/friendly-name",
  requirePermission("document:read"),
  apiHandler<
    EmptyObject,
    EmptyObject,
    { friendlyName: string },
    { id: string }
  >(async ({ diContainer, params: { id }, body, identity }) => {
    const { friendlyName } = z
      .object({ friendlyName: z.string().min(1) })
      .parse(body);
    const documentService = diContainer.get<DocumentService>(services.document);
    await documentService.updateFriendlyName(id, identity, friendlyName);
    return { status: 204, body: {} };
  }),
);

// No `requirePermission` middleware here on purpose: deletion is allowed for
// the document owner OR a holder of `document:delete`, which a single static
// permission guard cannot express. The authorization check lives in
// DocumentService.deleteDocument.
documentRouter.delete(
  "/:id",
  apiHandler<EmptyObject, EmptyObject, EmptyObject, { id: string }>(
    async ({ diContainer, params: { id }, identity }) => {
      const documentService = diContainer.get<DocumentService>(
        services.document,
      );
      await documentService.deleteDocument(id, identity);
      return {
        status: 204,
        body: {},
      };
    },
  ),
);

documentRouter.get(
  "/:id",
  requirePermission("document:read"),
  apiHandler<
    FileDownload | FileStream,
    EmptyObject,
    EmptyObject,
    { id: string }
  >(async ({ diContainer, params: { id }, headers, identity }) => {
    const scopeResolver = diContainer.get<AccessScopeResolver>(
      services.accessScopeResolver,
    );
    const scope = scopeResolver.documentScope(identity);
    const documentService = diContainer.get<DocumentService>(services.document);
    const result = await documentService.getDocument(id, headers.range, scope);
    return {
      status: 200,
      body: result,
    };
  }),
);
