import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MdOutlineLocalOffer } from "react-icons/md";
import { useNavigate } from "react-router";
import { enhancedApi } from "../app/enhancedApi";
import { TagList } from "../components/TagList";
import { Pagination } from "../components/Pagination";
import { usePageOffsetAndLimitParams } from "../hooks/usePageOffsetAndLimitParams";
import { useDebounce } from "../hooks/useDebounce";
import { EmptyState, Page, PageHeader } from "../components/Page";
import { Input } from "../components/Input";

export const TagsPage = () => {
  const { t } = useTranslation();
  const { limit, offset, page, setPage } = usePageOffsetAndLimitParams(50);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data } = enhancedApi.useListTagsQuery({
    limit,
    offset,
    query: debouncedSearch,
  });

  const total = useMemo(() => data?.total ?? 0, [data?.total]);
  const navigate = useNavigate();

  const tags = useMemo(
    () => data?.items.filter((tag) => tag.key !== "collection") ?? [],
    [data?.items],
  );

  return (
    <Page>
      <PageHeader
        icon={<MdOutlineLocalOffer />}
        title={t("pages.tags.title")}
        actions={
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("pages.tags.searchPlaceholder")}
            className="sm:w-64"
          />
        }
      />

      {tags.length === 0 && <EmptyState>{t("pages.tags.empty")}</EmptyState>}

      <TagList
        tags={tags}
        onClick={(tag) =>
          navigate(`../gallery?q=${tag.key}${tag.value ? `:${tag.value}` : ""}`)
        }
      />

      {total > limit && (
        <Pagination
          total={total}
          limit={limit}
          currentPage={page}
          onPageChange={setPage}
        />
      )}
    </Page>
  );
};
