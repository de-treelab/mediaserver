import { Reference, type ContainerBuilder } from "node-dependency-injection";
import { EnvironmentService } from "./common/EnvironmentService.js";
import { DbService } from "./sql/DbService.js";
import { MigrationService } from "./sql/MigrationService.js";
import { LoggingService } from "./common/LoggingService.js";
import { DocumentRepository } from "./documents/DocumentRepository.js";
import { DocumentService } from "./documents/DocumentService.js";
import { FileService } from "./files/FileService.js";
import {
  MainMessageService,
  MessageServiceClient,
} from "./common/MessageService.js";
import { WebSocketService } from "./websocket/WebSocketService.js";

export const services = {
  environment: "service.environment",
  db: "service.db",
  migration: "service.migration",
  logger: "service.logger",
  document: "service.document",
  file: "service.file",
  messageClient: "service.messageClient",
  messageServer: "service.messageServer",
  websocket: "service.websocket",
};

export const repositories = {
  document: "repository.document",
};

export const defaultDiContainer = (diContainer: ContainerBuilder) => {
  diContainer.register(services.environment, EnvironmentService);

  diContainer.register(services.logger, LoggingService);

  diContainer
    .register(services.db, DbService)
    .addArgument(new Reference(services.environment))
    .addArgument(new Reference(services.logger));

  diContainer
    .register(services.migration, MigrationService)
    .addArgument(new Reference(services.environment))
    .addArgument(new Reference(services.db))
    .addArgument(new Reference(services.logger));

  diContainer
    .register(repositories.document, DocumentRepository)
    .addArgument(new Reference(services.db));

  diContainer
    .register(services.document, DocumentService)
    .addArgument(new Reference(repositories.document));

  diContainer
    .register(services.file, FileService)
    .addArgument(new Reference(services.logger));

  diContainer
    .register(services.websocket, WebSocketService)
    .addArgument(new Reference(services.environment))
    .addArgument(new Reference(services.logger));

  diContainer.register(services.messageClient, MessageServiceClient);
  diContainer
    .register(services.messageServer, MainMessageService)
    .addArgument(new Reference(services.websocket))
    .addArgument(new Reference(services.document));

  return diContainer;
};
