import { enhancedApi } from "../app/enhancedApi";

export const TagsPage = () => {
  const { data, error, isLoading } = enhancedApi.useListTagsQuery({});

  return (
    <div>
      <h3>Tags</h3>
      <ul>
        {error && <li>Error loading tags: {JSON.stringify(error)}</li>}
        {isLoading && <li>Loading tags...</li>}
        {!isLoading && data?.items.length === 0 && <li>No tags found.</li>}
        {data?.items.map((tag) => (
          <li key={`${tag.key}:${tag.value ?? ""}`}>
            {tag.key}
            {tag.value ? `:${tag.value}` : ""} (used {tag.usageCount} times)
          </li>
        ))}
      </ul>
    </div>
  );
};
