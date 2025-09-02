import { Router } from "express";
import { apiHandler } from "../ApiHandler.js";
import { ApiError } from "../common/ApiError.js";
import { services } from "../DefaultDiContainer.js";
import type { MessageServiceClient } from "../common/MessageService.js";
import type { EmptyObject } from "../common/EmptyObject.js";

export const documentRouter = Router();

documentRouter.post(
  "/upload",
  apiHandler<EmptyObject, { webSocketClientId: string; extension: string }>(
    async ({ diContainer, files, query: { webSocketClientId, extension } }) => {
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
      });

      return {
        status: 200,
        body: {},
      };
    },
  ),
);
