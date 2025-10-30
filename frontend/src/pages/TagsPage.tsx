import { useMemo } from "react";
import { enhancedApi } from "../app/enhancedApi";
import { TagList } from "../components/TagList";
import { usePageOffsetAndLimitParams } from "../hooks/usePageOffsetAndLimitParams";
import { Pagination } from "../components/Pagination";
import { useNavigate } from "react-router";

export const TagsPage = () => {
  const { limit, offset, page, setPage } = usePageOffsetAndLimitParams();

  const { data } = enhancedApi.useListTagsQuery({
    limit: limit,
    offset: offset,
  });

  const total = useMemo(() => data?.total || 0, [data?.total]);

  const navigate = useNavigate();

  return (
    <div className="p-4">
      <Pagination
        total={total}
        limit={limit}
        currentPage={page}
        onPageChange={setPage}
      />
      <TagList
        tags={data?.items ?? []}
        onClick={(tag) =>
          navigate(`../gallery?q=${tag.key}${tag.value ? `:${tag.value}` : ""}`)
        }
      />
    </div>
  );
};
