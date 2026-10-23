import type { ApiTag } from "../app/api";
export declare const tagToString: (tag: ApiTag) => string;
export declare const stringToTag: (tag: string, type?: string) => ApiTag;
export declare const tagToQuery: (tag: ApiTag) => string;
export declare const collectionNameToQuery: (name: string) => string;
export declare const isCollectionNameValue: (value: string) => boolean;
