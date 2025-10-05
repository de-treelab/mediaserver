import { useMemo } from "react";
import { enhancedApi } from "../app/enhancedApi";
import { TagList } from "../components/TagList";
import { usePageOffsetAndLimitParams } from "../hooks/usePageOffsetAndLimitParams";
import { Pagination } from "../components/Pagination";

export const TagsPage = () => {
  const { limit, offset, page, setPage } = usePageOffsetAndLimitParams();

  const { data } = enhancedApi.useListTagsQuery({
    limit: limit,
    offset: offset,
  });

  const total = useMemo(() => data?.total || 0, [data?.total]);

  return (
    <div>
      <Pagination
        total={total}
        limit={limit}
        currentPage={page}
        onPageChange={setPage}
      />
      <TagList tags={data?.items ?? []} onClick={() => {}} />
    </div>
  );
};
