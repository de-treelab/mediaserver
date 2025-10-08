import { useCallback, useMemo } from "react";
import { useEasySearchParams } from "./useEasySearchParams";

export const usePageOffsetAndLimitParams = (initialLimit = 60) => {
  const {
    params: { page: searchPage, limit: searchLimit },
    addSearchParam,
  } = useEasySearchParams(["page", "limit"]);

  const currentPage = useMemo(
    () => parseInt(searchPage ?? "1") - 1,
    [searchPage],
  );

  const setCurrentPage = useCallback(
    (page: number) => {
      addSearchParam("page", (page + 1).toString());
    },
    [addSearchParam],
  );

  const currentLimit = useMemo(
    () => parseInt(searchLimit ?? initialLimit.toString()),
    [searchLimit, initialLimit],
  );

  const setCurrentLimit = useCallback(
    (page: number) => {
      addSearchParam("limit", (page + 1).toString());
    },
    [addSearchParam],
  );

  const currentOffset = useMemo(
    () => currentPage * currentLimit,
    [currentPage, currentLimit],
  );

  return {
    page: currentPage,
    limit: currentLimit,
    offset: currentOffset,
    setPage: setCurrentPage,
    setLimit: setCurrentLimit,
  };
};
