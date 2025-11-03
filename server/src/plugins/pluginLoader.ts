import z from "zod";
import * as fs from "fs/promises";
import path from "path";
import { addFileTypePlugin } from "./fileTypes.js";
import { DI_CONTAINER } from "../DiContainer.js";
import { LoggingService } from "../common/LoggingService.js";
import { services } from "../DefaultDiContainer.js";

const manifestSchema = z.object({
  plugins: z.array(
    z.object({
      name: z.string(),
      path: z.string(),
    }),
  ),
});

export const loadPlugins = async (
  manifestPath: string = path.join(process.cwd(), "manifest.json"),
): Promise<void> => {
  const logger = DI_CONTAINER.get<LoggingService>(services.logger);

  logger.info(`Loading plugins from manifest: ${manifestPath}`);

  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8"));
  const result = manifestSchema.safeParse(manifest);
  if (!result.success) {
    throw new Error("Invalid manifest");
  }

  logger.info(
    `Loading plugins: ${result.data.plugins.map((p) => p.name).join(", ")}`,
  );

  for (const plugin of result.data.plugins) {
    try {
      const pluginModule = (await import(plugin.path)).default;

      addFileTypePlugin(plugin.name, pluginModule.default);

      logger.info(`Loaded plugin: ${plugin.name}`);
    } catch (error) {
      logger.error(`Failed to load plugin: ${plugin.name}`, error as Error);
      logger.info(`Continuing without plugin: ${plugin.name}`);
    }
  }
};
