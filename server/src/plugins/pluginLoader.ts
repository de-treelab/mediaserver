import z from "zod";
import * as fs from "fs/promises";
import path from "path";
import { addFileTypePlugin } from "./fileTypes.js";

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
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8"));
  const result = manifestSchema.safeParse(manifest);
  if (!result.success) {
    throw new Error("Invalid manifest");
  }

  for (const plugin of result.data.plugins) {
    const pluginModule = await import(plugin.path);

    addFileTypePlugin(pluginModule.default);
  }
};
