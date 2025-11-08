import { parentPort, MessageChannel } from "worker_threads";
import {
  MessageServiceClient,
  WorkerMessageService,
} from "./common/MessageService.js";
import { standardPlugins } from "./plugins/standardPlugins.js";
import { addFileTypePlugin } from "./plugins/fileTypes.js";
import { setupDiContainer } from "./DiContainer.js";
import { TagService } from "./tags/TagService.js";
import { services } from "./DefaultDiContainer.js";
import type { DbService } from "./sql/DbService.js";
import { DocumentService } from "./documents/DocumentService.js";
import { RedisClient } from "./redis/RedisClient.js";
import { type Logger } from "./common/LoggingService.js";
import { loadPlugins } from "./plugins/pluginLoader.js";

Object.entries(standardPlugins).forEach(([name, plugin]) => {
  addFileTypePlugin(name, plugin);
});

await loadPlugins();

const diContainer = await setupDiContainer();

const logger = diContainer.get<Logger>(services.logger);

await diContainer.get<DbService>(services.db).connect();
await diContainer.get<RedisClient>(services.redis).connect();

const tagService = diContainer.get<TagService>(services.tag);
await tagService.initIdCache();

const messageServiceClient = new MessageServiceClient();
const messageServiceServer = new WorkerMessageService(
  tagService,
  diContainer.get<DocumentService>(services.document),
);
messageServiceServer.client = messageServiceClient;

const { port1, port2 } = new MessageChannel();

port1.on("message", (msg) => {
  messageServiceServer.sendMessage(msg);
});
port1.start();
messageServiceClient.port = port1;

parentPort?.postMessage({ port: port2 }, [port2]);

let isRunning = true;

parentPort?.on("close", () => {
  isRunning = false;
});

logger.info("Worker started");

while (isRunning) {
  await messageServiceServer.processMessages();
  await new Promise((resolve) => setTimeout(resolve, 100));
}
