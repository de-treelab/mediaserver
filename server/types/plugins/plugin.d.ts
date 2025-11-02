export type ThumbnailResult = {
    path: string;
};
export type ThumbnailCreationContext = {
    uuidv4: () => string;
    path: string;
};
export type FileTypePlugin = {
    matcher: (fileType: string) => boolean;
    thumbnailCreator: (context: ThumbnailCreationContext) => Promise<ThumbnailResult>;
};
