import z from "zod";
import { addFileTypePlugin } from "./fileTypes.js";

const manifestSchema = z.object({
  plugins: z.array(
    z.object({
      name: z.string(),
      entry: z.string(),
    }),
  ),
});

export const loadPlugins = async (
  manifestPath: string = "./manifest.json",
): Promise<void> => {
  const manifest = await import(manifestPath);
  const result = manifestSchema.safeParse(manifest);
  if (!result.success) {
    throw new Error("Invalid manifest");
  }

  for (const plugin of result.data.plugins) {
    const pluginModule = await import(plugin.entry);

    addFileTypePlugin(pluginModule.default);
  }
};
