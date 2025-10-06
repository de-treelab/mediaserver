import type { ApiTag } from "../app/api";

export const tagToString = (tag: ApiTag) =>
  `${tag.key}${tag.value ? `:${tag.key}` : ""}`;

export const stringToTag = (tag: string): ApiTag => {
  const parts = tag.split(":", 2);
  if (parts.length === 1) {
    return { key: parts[0]!.trim() };
  } else {
    return { key: parts[0]!.trim(), value: parts[1]!.trim() };
  }
};
