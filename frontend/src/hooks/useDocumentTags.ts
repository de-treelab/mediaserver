import { useEffect, useMemo } from "react";
import { shallowEqual } from "react-redux";
import type { ApiTag } from "../app/api";
import { enhancedApi } from "../app/enhancedApi";
import { useAppDispatch, useAppSelector } from "../app/store";

/**
 * Tags of the given documents by id, fetched with one request per group so
 * that groups stay cached while others are added or dropped.
 */
export const useDocumentTags = (idGroups: string[][]) => {
  const dispatch = useAppDispatch();

  // Stable as long as the groups don't change, however often they are rebuilt
  const key = JSON.stringify(idGroups);
  const groups = useMemo(() => JSON.parse(key) as string[][], [key]);

  useEffect(() => {
    const subscriptions = groups.map((ids) =>
      dispatch(enhancedApi.endpoints.listDocumentsByIds.initiate(ids)),
    );
    return () => subscriptions.forEach((s) => s.unsubscribe());
  }, [dispatch, groups]);

  const results = useAppSelector(
    (state) =>
      groups.map(
        (ids) =>
          enhancedApi.endpoints.listDocumentsByIds.select(ids)(state).data,
      ),
    shallowEqual,
  );

  return useMemo(() => {
    const tags: Record<string, ApiTag[]> = {};
    for (const documents of results) {
      for (const document of documents ?? []) {
        tags[document.id] = document.tags;
      }
    }
    return tags;
  }, [results]);
};
