import type { IconType } from "react-icons";

export type DiashowContext = {
  nextDocument: () => void;
  defaultTimeout: number;
  objectUrl: string;
};

export type RenderContext = {
  objectUrl: string;
};

export type FileTypePlugin = {
  matcher: (fileType: string) => boolean;
  icon: IconType;
  Render: React.FC<RenderContext>;
  Diashow: React.FC<DiashowContext>;
};

export const fileTypes: FileTypePlugin[] = [];

export const addFileTypePlugin = (plugin: FileTypePlugin) => {
  fileTypes.push(plugin);
};
