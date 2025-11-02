import type { FileTypePlugin } from "../plugins/plugin";
import { standardPlugins } from "../plugins/standardPlugins";

export const isPluginTrusted = (plugin: FileTypePlugin) => {
  return standardPlugins.includes(plugin);
};

export const useIsPluginTrusted = (plugin: FileTypePlugin) => {
  return isPluginTrusted(plugin);
};
