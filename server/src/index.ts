import * as express from "express";
import { EnvironmentService } from "./common/EnvironmentService.js";
import { services } from "./DefaultDiContainer.js";
import { DI_CONTAINER, setupDiContainer } from "./DiContainer.js";
import { MigrationService } from "./sql/MigrationService.js";
import { DbService } from "./sql/DbService.js";
import fileUpload from "express-fileupload";
import { SHARE_ENV, Worker } from "worker_threads";
import {
  MainMessageService,
  type MessageServiceClient,
} from "./common/MessageService.js";
import { ApiError } from "./common/ApiError.js";
import { documentRouter } from "./routers/DocumentRouter.js";
import * as cors from "cors";
import { apiHandler } from "./ApiHandler.js";
import { WebSocketService } from "./websocket/WebSocketService.js";
import { tagRouter } from "./routers/TagRouter.js";
import { TagService } from "./tags/TagService.js";
import { RedisClient } from "./redis/RedisClient.js";
import { stateRouter } from "./routers/StateRouter.js";
import type { LoggingService } from "./common/LoggingService.js";

async function run(envService: EnvironmentService) {
  const app = express.default();
  const port = envService.backendPort;

  app.use(express.json());
  app.use(cors.default());

  app.use(
    express.urlencoded({
      extended: true,
    }),
  );

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

  app.use("/documents", documentRouter);
  app.use("/tags", tagRouter);
  app.use("/state", stateRouter);

  const logger = DI_CONTAINER.get<LoggingService>(services.logger);

  app.listen(port, () => {
    logger.info(`Server is running on http://localhost:${port}`);
  });
}

async function main() {
  const diContainer = await setupDiContainer();
  const dbService = diContainer.get<DbService>(services.db);
  const migrationService = diContainer.get<MigrationService>(
    services.migration,
  );

  await dbService.connect();
  await migrationService.migrate();

  const messageService = diContainer.get<MainMessageService>(
    services.messageServer,
  );
  const messageServiceClient = diContainer.get<MessageServiceClient>(
    services.messageClient,
  );
  messageService.client = messageServiceClient;

  const worker = new Worker(import.meta.dirname + "/worker.js", {
    stdout: true,
    stderr: true,
    env: SHARE_ENV,
  });

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
  worker.stdout?.on("data", (data) => {
    process.stdout.write(`[WORKER] -> ${data}`);
  });
  worker.stderr?.on("data", (data) => {
    process.stderr.write(`[WORKER] -> ${data}`);
  });
  worker.on("error", (err) => {
    console.error("[WORKER] ", err);
    process.exit(1);
  });
  worker.on("exit", (code) => {
    console.log("[WORKER] Worker exited with code:", code);
    process.exit(code === 0 ? 0 : 1);
  });

  const webSocketServer = diContainer.get<WebSocketService>(services.websocket);

  process.on("exit", () => {
    worker.terminate();
    webSocketServer.stop();
  });

  let i = 50;
  while (!messageService.acked && i > 0) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    i--;
  }

  if (!messageService.acked) {
    throw new ApiError("MessageServiceError", 500, "Message service not acked");
  }

  const envService = diContainer.get<EnvironmentService>(services.environment);
  const tagService = diContainer.get<TagService>(services.tag);
  const redisClient = diContainer.get<RedisClient>(services.redis);

  await webSocketServer.start();
  await redisClient.connect();
  await tagService.initIdCache();

  await run(envService);
}

void main().catch((err) => {
  console.error(err, new Error().stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error(
    "Unhandled Rejection at:",
    promise,
    "reason:",
    reason instanceof Error ? reason.stack : reason,
  );
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception thrown:", err, err.stack);
  process.exit(1);
});
