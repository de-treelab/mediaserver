import { Router } from "express";
import { apiHandler, FileDownload } from "../ApiHandler.js";
import { ApiError } from "../common/ApiError.js";
import { services } from "../DefaultDiContainer.js";
import type { MessageServiceClient } from "../common/MessageService.js";
import type { EmptyObject } from "../common/EmptyObject.js";
import type { DocumentService } from "../documents/DocumentService.js";
import type { PaginatedResponse } from "../util/PaginatedResponse.js";
import type { Document } from "../documents/DocumentRepository.js";
import type { TagService } from "../tags/TagService.js";
import z from "zod";

export const documentRouter = Router();

type DocumentUpload = {
  tags: string;
};

documentRouter.post(
  "/upload",
  apiHandler<
    EmptyObject,
    { webSocketClientId: string; extension: string },
    DocumentUpload
  >(
    async ({
      diContainer,
      files,
      query: { webSocketClientId, extension },
      body: { tags },
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

      const messageService = diContainer.get<MessageServiceClient>(
        services.messageClient,
      );
      messageService.sendMessage({
        type: "process-upload",
        name: file.name,
        file: file.tempFilePath,
        size: file.size,
        mimeType: file.mimetype,
        webSocketClientId: decodeURIComponent(webSocketClientId),
        extension,
        tags: z
          .array(
            z.object({
              key: z.string(),
              value: z.string().or(z.undefined()),
              type: z.string(),
            }),
          )
          .parse(JSON.parse(tags)),
      });

      return {
        status: 200,
        body: {},
      };
    },
  ),
);

documentRouter.get(
  "/",
  apiHandler<
    PaginatedResponse<Document>,
    { limit?: number; offset?: number; query?: string }
  >(async ({ diContainer, query: { limit = 100, offset = 0, query = "" } }) => {
    const tagService = diContainer.get<TagService>(services.tag);
    const response = await tagService.listDocuments({
      limit,
      offset,
      query: decodeURIComponent(query),
    });
    return {
      status: 200,
      body: response,
    };
  }),
);

documentRouter.get(
  "/:id/thumbnail",
  apiHandler<FileDownload, EmptyObject, EmptyObject, { id: string }>(
    async ({ diContainer, params: { id } }) => {
      const documentService = diContainer.get<DocumentService>(
        services.document,
      );
      const thumbnailPath = await documentService.getDocumentThumbnail(id);
      return {
        status: 200,
        body: new FileDownload(thumbnailPath, "image/jpeg"),
      };
    },
  ),
);

documentRouter.get(
  "/:id",
  apiHandler<FileDownload, EmptyObject, EmptyObject, { id: string }>(
    async ({ diContainer, params: { id } }) => {
      const documentService = diContainer.get<DocumentService>(
        services.document,
      );
      const { path, mimeType } = await documentService.getDocument(id);
      return {
        status: 200,
        body: new FileDownload(path, mimeType),
      };
    },
  ),
);
