import { useEffect, useState } from "react";
import { enhancedApi } from "../app/enhancedApi";
import { useDebounce } from "./useDebounce";

export const useTagCompletion = (query: string) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const debouncedQuery = useDebounce(query, 300);

  const { data, isLoading, error } = enhancedApi.useListTagsQuery({
    limit: 10,
    offset: 0,
    query: debouncedQuery,
  });

  useEffect(() => {
    if (data) {
      setSuggestions(
        data.items.map(
          (tag) =>
            `${tag.key}${tag.value ? `:${tag.value}` : ""} (${tag.usageCount})`,
        ),
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
