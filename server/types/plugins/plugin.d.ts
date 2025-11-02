type ThumbnailResult = {
    path: string;
};
export type FileTypePlugin = {
    matcher: (fileType: string) => boolean;
    thumbnailCreator: (path: string) => Promise<ThumbnailResult>;
};
export {};
