import type { FileTypePlugin } from "./plugin.js";

export const fileTypes: Record<string, FileTypePlugin> = {};

export const addFileTypePlugin = (name: string, plugin: FileTypePlugin) => {
  fileTypes[name] = plugin;
};
