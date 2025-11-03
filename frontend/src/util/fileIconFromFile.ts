import { FaFile } from "react-icons/fa";
import { fileTypes } from "../plugins/addFileTypePlugin";
import type { FileProxy } from "../upload/UploadContext";
import { reactIcons } from "../plugins/plugin";

export const fileIconFromMimeType = (mimeType: string) => {
  for (const plugin of fileTypes) {
    if (plugin.matcher(mimeType)) {
      return plugin.icon(reactIcons);
    }
  }

  return FaFile;
};

export const fileIconFromFile = (file: FileProxy) => {
  return fileIconFromMimeType(file.type);
};
