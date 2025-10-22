import { useEffect, useState } from "react";
import { enhancedApi } from "../app/enhancedApi";
import { useDebounce } from "./useDebounce";

interface TagCompletionItem {
  tag: string;
  usageCount: number;
}

export const useTagCompletion = (query: string) => {
  const [suggestions, setSuggestions] = useState<TagCompletionItem[]>([]);
  const debouncedQuery = useDebounce(query, 300);

  const { data, isLoading, error } = enhancedApi.useListTagsQuery({
    limit: 10,
    offset: 0,
    query: debouncedQuery,
  });

  useEffect(() => {
    if (data) {
      setSuggestions(
        data.items.map((tag) => ({
          tag: `${tag.key}${tag.value ? `:${tag.value}` : ""}`,
          usageCount: tag.usageCount,
        })),
      );
    } else {
      setSuggestions([]);
    }
  }, [data]);

  return {
    suggestions,
    isLoading,
    error,
  };
};
