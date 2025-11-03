import type { FileTypePlugin } from "./plugin";

export const fileTypes: FileTypePlugin[] = [];

export const addFileTypePlugin = (plugin: FileTypePlugin) => {
  fileTypes.push(plugin);
};
