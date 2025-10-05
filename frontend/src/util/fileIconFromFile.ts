import { FaFile } from "react-icons/fa";
import { fileTypes } from "../plugins/fileTypes";
import type { FileProxy } from "../upload/UploadContext";

export const fileIconFromFile = (file: FileProxy) => {
  for (const plugin of fileTypes) {
    if (plugin.matcher(file.type)) {
      return plugin.icon;
    }
  }

  return FaFile;
};
