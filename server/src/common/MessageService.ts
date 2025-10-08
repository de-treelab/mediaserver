import type { MessagePort } from "worker_threads";
import type { WebSocketService } from "../websocket/WebSocketService.js";
import { FileService } from "../files/FileService.js";
import { ApiError } from "./ApiError.js";
import type { ApiTag } from "../tags/TagRepository.js";
import type { TagService } from "../tags/TagService.js";
import { tagToString } from "../util/tag.js";
import type { DocumentService } from "../documents/DocumentService.js";

type ProcessUploadMessage = {
  type: "process-upload";
  name: string;
  file: string;
  size: number;
  mimeType: string;
  extension: string;
  webSocketClientId: string;
  tags: ApiTag[];
};

type UploadFinishedMessage = {
  type: "upload-finished";
  file: string;
  id: string;
  basePath: string;
  filename: string;
  mimeType: string;
  webSocketClientId: string;
};

type UploadFailedMessage = {
  type: "upload-failed";
  file: string;
  webSocketClientId: string;
  reason: string;
};

type AcknowledgmentMessage = {
  type: "ack";
};

type Message =
  | ProcessUploadMessage
  | UploadFinishedMessage
  | UploadFailedMessage
  | AcknowledgmentMessage;

abstract class MessageService {
  private readonly queue: Message[] = [];
  private acked_: boolean = false;
  protected client_: MessageServiceClient | null = null;

  constructor(private readonly immediateProcessingMode = false) {}

  public async sendMessage(message: Message): Promise<void> {
    this.queue.push(message);

    if (this.immediateProcessingMode) {
      await this.processMessages();
    }
  }

  public get acked(): boolean {
    return this.acked_;
  }

  public set client(client: MessageServiceClient) {
    this.client_ = client;
  }

  abstract processUploadMessage(upload: ProcessUploadMessage): Promise<void>;

  abstract processUploadFinishedMessage(
    finished: UploadFinishedMessage,
  ): Promise<void>;

  abstract processUploadFailedMessage(
    failed: UploadFailedMessage,
  ): Promise<void>;

  public async processMessages(): Promise<void> {
    while (this.queue.length > 0) {
      try {
        const message = this.queue.shift();
        if (message) {
          switch (message.type) {
            case "upload-finished":
              await this.processUploadFinishedMessage(message);
              break;
            case "process-upload":
              await this.processUploadMessage(message);
              break;
            case "upload-failed":
              await this.processUploadFailedMessage(message);
              break;
            case "ack":
              if (!this.acked_) {
                this.acked_ = true;
                this.client_?.sendMessage({ type: "ack" });
              }
              break;
            default:
              console.log("Unknown message type:", message);
              break;
          }
        }
      } catch (error) {
        console.error("Error occurred while processing message:", error);
      }
    }
  }
}

export class WorkerMessageService extends MessageService {
  constructor(
    private readonly tagService: TagService,
    private readonly documentService: DocumentService,
  ) {
    super(false);
  }

  private readonly fileService = new FileService();

  async processUploadMessage(upload: ProcessUploadMessage): Promise<void> {
    try {
      const { id, basePath, filename } = await this.fileService.moveDocument(
        upload.file,
        upload.mimeType,
        upload.extension,
        upload.size,
      );

      await this.documentService.createDocument({
        id,
        basePath,
        filename,
        type: upload.mimeType,
      });

      await Promise.all(
        upload.tags.map((tag) =>
          this.tagService.addTagToDocument(id, tagToString(tag)),
        ),
      );

      this.client_?.sendMessage({
        type: "upload-finished",
        file: upload.name,
        id,
        basePath,
        filename,
        mimeType: upload.mimeType,
        webSocketClientId: upload.webSocketClientId,
      });
    } catch (error) {
      let message = "Unknown error";
      if (error instanceof ApiError) {
        message = error.message;
      }
      console.error("Error occurred while processing upload message:", error);
      this.client_?.sendMessage({
        type: "upload-failed",
        file: upload.name,
        webSocketClientId: upload.webSocketClientId,
        reason: message,
      });
    }
  }

  async processUploadFinishedMessage(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _finished: UploadFinishedMessage,
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async processUploadFailedMessage(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _failed: UploadFailedMessage,
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }
}

export class MainMessageService extends MessageService {
  constructor(private readonly webSocketServer: WebSocketService) {
    super(true);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async processUploadMessage(_upload: ProcessUploadMessage): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async processUploadFinishedMessage(
    finished: UploadFinishedMessage,
  ): Promise<void> {
    await this.webSocketServer.send(
      JSON.stringify({
        type: "upload-finished",
        file: finished.file,
      }),
      finished.webSocketClientId,
    );
  }

  async processUploadFailedMessage(failed: UploadFailedMessage): Promise<void> {
    await this.webSocketServer.send(
      JSON.stringify({
        type: "upload-failed",
        file: failed.file,
        reason: failed.reason,
      }),
      failed.webSocketClientId,
    );
  }
}

export class MessageServiceClient {
  private port_?: MessagePort;

  public set port(port: MessagePort) {
    this.port_ = port;
  }

  public async sendMessage(message: Message): Promise<void> {
    this.port_?.postMessage(message);
  }
}
