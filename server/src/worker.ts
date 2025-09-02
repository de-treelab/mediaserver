import { parentPort, MessageChannel } from "worker_threads";
import {
  MessageServiceClient,
  WorkerMessageService,
} from "./common/MessageService.js";
import {
  imagePlugin,
  pdfPlugin,
  videoPlugin,
} from "./plugins/standardPlugins.js";
import { addFileTypePlugin } from "./plugins/fileTypes.js";

addFileTypePlugin(imagePlugin);
addFileTypePlugin(videoPlugin);
addFileTypePlugin(pdfPlugin);

const messageServiceClient = new MessageServiceClient();
const messageServiceServer = new WorkerMessageService();
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

while (isRunning) {
  await messageServiceServer.processMessages();
  await new Promise((resolve) => setTimeout(resolve, 100));
}
