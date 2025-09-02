type ThumbnailResult = {
  path: string;
};

export type FileTypePlugin = {
  matcher: (fileType: string) => boolean;
  thumbnailCreator: (path: string) => Promise<ThumbnailResult>;
};

export const fileTypes: FileTypePlugin[] = [];

export const addFileTypePlugin = (plugin: FileTypePlugin) => {
  fileTypes.push(plugin);
};
