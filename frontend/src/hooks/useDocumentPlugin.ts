import { fileTypes, type FileTypePlugin } from "../plugins/fileTypes";
import { unsupportedTypePlugin } from "../plugins/standardPlugins";

export const useDocumentPlugin = (type?: string): FileTypePlugin => {
  if (!type) {
    return unsupportedTypePlugin;
  }

  for (const plugin of fileTypes) {
    if (plugin.matcher(type)) {
      return plugin;
    }
  }

  return unsupportedTypePlugin;
};
