import { Router } from "express";
import { apiHandler } from "../ApiHandler.js";
import { services } from "../DefaultDiContainer.js";
import type { PaginatedResponse } from "../util/PaginatedResponse.js";
import type { TagService } from "../tags/TagService.js";
import type { ApiTag } from "../tags/TagRepository.js";
import type { EmptyObject } from "../common/EmptyObject.js";

export const tagRouter = Router();

tagRouter.get(
  "/",
  apiHandler<
    PaginatedResponse<ApiTag>,
    { limit?: number; offset?: number; query?: string }
  >(async ({ diContainer, query: { limit = 100, offset = 0, query = "" } }) => {
    const tagService = diContainer.get<TagService>(services.tag);
    const response = await tagService.listTags({ limit, offset, query });
    return {
      status: 200,
      body: response,
    };
  }),
);

tagRouter.post(
  "/:documentId/add",
  apiHandler<EmptyObject, EmptyObject, { tag: string }, { documentId: string }>(
    async ({ diContainer, params: { documentId }, body: { tag } }) => {
      const tagService = diContainer.get<TagService>(services.tag);
      await tagService.addTagToDocument(documentId, tag);
      return {
        status: 204,
        body: {},
      };
    },
  ),
);

tagRouter.post(
  "/:documentId/remove",
  apiHandler<EmptyObject, EmptyObject, { tag: string }, { documentId: string }>(
    async ({ diContainer, params: { documentId }, body: { tag } }) => {
      const tagService = diContainer.get<TagService>(services.tag);
      await tagService.removeTagFromDocument(documentId, tag);
      return {
        status: 204,
        body: {},
      };
    },
  ),
);
