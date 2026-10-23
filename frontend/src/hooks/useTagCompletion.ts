import { useEffect, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { enhancedApi } from "../app/enhancedApi";
import { useDebounce } from "./useDebounce";
import { collectionNameToQuery } from "../util/tag";

export type TagCompletionItem =
  | { kind: "tag"; tag: string; usageCount: number }
  | { kind: "collection"; tag: string; name: string };

const COLLECTION_PREFIX = /^collection:/i;

// Drops the quotes of a (possibly still unterminated) quoted string
const stripPartialQuotes = (value: string) =>
  value.replace(/^["`]/, "").replace(/["`]$/, "");

export const useTagCompletion = (query: string) => {
  const [suggestions, setSuggestions] = useState<TagCompletionItem[]>([]);
  const debouncedQuery = useDebounce(query, 300);

  // `collection:<name>` only completes collection names, any other word
  // completes tags as well as collections whose name contains it
  const isCollectionQuery = COLLECTION_PREFIX.test(debouncedQuery);
  const collectionName = stripPartialQuotes(
    isCollectionQuery
      ? debouncedQuery.replace(COLLECTION_PREFIX, "")
      : debouncedQuery,
  ).trim();

  const { data, isLoading, error } = enhancedApi.useListTagsQuery(
    isCollectionQuery
      ? skipToken
      : {
          limit: 10,
          offset: 0,
          query: debouncedQuery,
        },
  );

  const { data: collections } = enhancedApi.useListCollectionsQuery(
    isCollectionQuery || collectionName
      ? { limit: isCollectionQuery ? 10 : 5, offset: 0, name: collectionName }
      : skipToken,
  );

  useEffect(() => {
    const tagItems: TagCompletionItem[] = isCollectionQuery
      ? []
      : (data?.items ?? [])
          // Static collection membership tags (collection:<id>) are offered
          // by collection name instead
          .filter((tag) => tag.type !== "collection")
          .map((tag) => ({
            kind: "tag",
            tag: `${tag.key}${tag.value ? `:${tag.value}` : ""}`,
            usageCount: tag.usageCount,
          }));

    const collectionItems: TagCompletionItem[] = [];
    const seen = new Set<string>();
    for (const collection of collections?.items ?? []) {
      // Collections sharing a name are matched together
      const key = collection.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      collectionItems.push({
        kind: "collection",
        tag: collectionNameToQuery(collection.name),
        name: collection.name,
      });
    }

    setSuggestions([...collectionItems, ...tagItems]);
  }, [data, collections, isCollectionQuery]);

  return {
    suggestions,
    isLoading,
    error,
  };
};
