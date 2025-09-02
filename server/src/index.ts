import * as express from "express";
import { EnvironmentService } from "./common/EnvironmentService.js";
import { services } from "./DefaultDiContainer.js";
import { setupDiContainer } from "./DiContainer.js";
import { MigrationService } from "./sql/MigrationService.js";
import { DbService } from "./sql/DbService.js";
import fileUpload from "express-fileupload";
import { Worker } from "worker_threads";
import {
  MainMessageService,
  type MessageServiceClient,
} from "./common/MessageService.js";
import { ApiError } from "./common/ApiError.js";
import { documentRouter } from "./routers/DocumentRouter.js";
import * as cors from "cors";
import { apiHandler } from "./ApiHandler.js";
import { WebSocketService } from "./websocket/WebSocketService.js";

async function run(envService: EnvironmentService) {
  const app = express.default();
  const port = envService.backendPort;

  app.use(express.json());
  app.use(cors.default());

  app.use(
    fileUpload({
      limits: { fileSize: envService.fileUploadSizeLimit },
      useTempFiles: true,
      tempFileDir: "/tmp/",
    }),
  );

  app.get(
    "/health",
    apiHandler(async () => {
      return {
        status: 200,
        body: {
          status: "healthy",
        },
      };
    }),
  );

  app.use("/document", documentRouter);

  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

async function main() {
  const diContainer = await setupDiContainer();
  const webSocketServer = diContainer.get<WebSocketService>(services.websocket);

  const messageService = diContainer.get<MainMessageService>(
    services.messageServer,
  );
  const messageServiceClient = diContainer.get<MessageServiceClient>(
    services.messageClient,
  );
  messageService.client = messageServiceClient;

  const worker = new Worker(import.meta.dirname + "/worker.js");

  worker.once("message", (message) => {
    const { port } = message;
    port.on("message", (msg: unknown) => {
      // @ts-expect-error we ignore this
      messageService.sendMessage(msg);
    });
    port.start();
    messageServiceClient.port = port;
    port.postMessage({ type: "ack" });
  });

  process.on("exit", () => {
    worker.terminate();
    webSocketServer.stop();
  });

  let i = 5;
  while (!messageService.acked && i > 0) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    i--;
  }

  if (!messageService.acked) {
    throw new ApiError("MessageServiceError", 500, "Message service not acked");
  }

  const envService = diContainer.get<EnvironmentService>(services.environment);
  const dbService = diContainer.get<DbService>(services.db);
  const migrationService = diContainer.get<MigrationService>(
    services.migration,
  );

  await dbService.connect();
  await migrationService.migrate();
  await webSocketServer.start();

  await run(envService);
}

void main();
