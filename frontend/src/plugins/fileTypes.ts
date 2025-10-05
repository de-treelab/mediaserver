import type { IconType } from "react-icons";

export type FileTypePlugin = {
  matcher: (fileType: string) => boolean;
  icon: IconType;
  render: (objectUrl: string) => React.ReactNode;
};

export const fileTypes: FileTypePlugin[] = [];

export const addFileTypePlugin = (plugin: FileTypePlugin) => {
  fileTypes.push(plugin);
};
