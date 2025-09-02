import type { IconType } from "react-icons";
import type { FileProxy } from "../upload/UploadContext";

export type FileTypePlugin = {
  matcher: (file: FileProxy) => boolean;
  icon: IconType;
};

export const fileTypes: FileTypePlugin[] = [];

export const addFileTypePlugin = (plugin: FileTypePlugin) => {
  fileTypes.push(plugin);
};
