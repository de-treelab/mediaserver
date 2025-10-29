import { createLogger, format, transports } from "winston";
import type { EnvironmentService } from "./EnvironmentService.js";

export type Logger = {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
  critical: (message: string, ...args: unknown[]) => void;
};

export class LoggingService implements Logger {
  private readonly logger;

  constructor(private readonly envService: EnvironmentService) {
    this.logger = createLogger({
      level: envService.logLevel || "info",
      format:
        envService.stage !== "production"
          ? // Pretty print logs in development
            format.combine(
              format.colorize(),
              format.timestamp(),
              format.printf(
                ({ timestamp, level, message }) =>
                  `[${timestamp}] ${level}: ${message}`,
              ),
            )
          : // Use JSON format in production
            format.json(),
      transports: [
        new transports.Console(),
        new transports.File({ filename: "error.log", level: "error" }),
        new transports.File({ filename: "output.log" }),
      ],
    });
  }

  debug(message: string, ...args: unknown[]): void {
    this.logger.debug(message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.logger.info(message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.logger.warn(message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.logger.error(message, ...args);
  }

  critical(message: string, ...args: unknown[]): void {
    this.logger.crit(message, ...args);
  }
}
