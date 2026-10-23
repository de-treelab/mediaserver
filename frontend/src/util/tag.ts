import type { ApiTag } from "../app/api";

export const tagToString = (tag: ApiTag) =>
  `${tag.key}${tag.value ? `:${tag.value}` : ""}`;

export const stringToTag = (tag: string, type: string = "default"): ApiTag => {
  const parts = tag.split(":", 2);
  if (parts.length === 1) {
    return { key: parts[0]!.trim(), type };
  } else {
    return { key: parts[0]!.trim(), value: parts[1]!.trim(), type };
  }
};

// Characters the tag query scanner treats as operators/delimiters. A key or
// value containing any of these (or whitespace) must be quoted so the parser
// reads it as a single token instead of splitting it apart.
const TAG_QUERY_SPECIAL = /[\s&|!():"`]/;

const quoteTagPart = (part: string): string => {
  if (!TAG_QUERY_SPECIAL.test(part)) return part;
  // The scanner has no escape syntax inside strings, so pick a quote character
  // the value does not already contain.
  if (!part.includes('"')) return `"${part}"`;
  if (!part.includes("`")) return `\`${part}\``;
  return `"${part}"`;
};

// Serialize a tag into a valid tag-query-language token (the inverse of the
// parser). Use this whenever a tag is turned into a filter query so that tags
// whose key or value contain whitespace (or other special characters) round
// trip correctly instead of being split into separate tokens.
export const tagToQuery = (tag: ApiTag): string =>
  tag.value
    ? `${quoteTagPart(tag.key)}:${quoteTagPart(tag.value)}`
    : quoteTagPart(tag.key);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// `collection:"<name>"` filters a gallery query by collection name. UUID values
// are static collection membership tags instead.
export const collectionNameToQuery = (name: string): string =>
  tagToQuery({ key: "collection", value: name, type: "default" });

export const isCollectionNameValue = (value: string): boolean =>
  !UUID_PATTERN.test(value);
