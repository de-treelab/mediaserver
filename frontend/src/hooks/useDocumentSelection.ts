import { useCallback, useMemo, useState } from "react";
import type { DocumentSelection } from "../app/api";

// Either the selected documents, or all documents matching the query except
// the deselected ones. Both keep the documents differing from the default in
// a set, so toggling works the same way.
type Selection =
  | { type: "ids"; ids: Set<string> }
  | { type: "query"; query: string; excluded: Set<string> };

const NOTHING: Selection = { type: "ids", ids: new Set() };

const toggled = (set: Set<string>, ids: string[], add: boolean) => {
  const next = new Set(set);
  ids.forEach((id) => (add ? next.add(id) : next.delete(id)));
  return next;
};

/**
 * Documents selected for bulk editing. Selecting all documents matching
 * `query` doesn't need their ids; the server resolves the query instead.
 */
export const useDocumentSelection = (query: string, total: number) => {
  const [selection, setSelection] = useState<Selection>(NOTHING);

  // Selecting all refers to one query, a different filter starts over
  const [selectionQuery, setSelectionQuery] = useState(query);
  if (selectionQuery !== query) {
    setSelectionQuery(query);
    if (selection.type === "query") setSelection(NOTHING);
  }

  const isSelected = useCallback(
    (id: string) =>
      selection.type === "ids"
        ? selection.ids.has(id)
        : !selection.excluded.has(id),
    [selection],
  );

  const setSelected = useCallback(
    (ids: string[], selected: boolean) =>
      setSelection((prev) =>
        prev.type === "ids"
          ? { type: "ids", ids: toggled(prev.ids, ids, selected) }
          : { ...prev, excluded: toggled(prev.excluded, ids, !selected) },
      ),
    [],
  );

  const toggle = useCallback(
    (id: string) =>
      setSelection((prev) => {
        const set = prev.type === "ids" ? prev.ids : prev.excluded;
        const next = toggled(set, [id], !set.has(id));
        return prev.type === "ids"
          ? { type: "ids", ids: next }
          : { ...prev, excluded: next };
      }),
    [],
  );

  const selectAll = useCallback(
    () => setSelection({ type: "query", query, excluded: new Set() }),
    [query],
  );

  const clear = useCallback(() => setSelection(NOTHING), []);

  const request = useMemo(
    (): DocumentSelection =>
      selection.type === "ids"
        ? { type: "ids", ids: [...selection.ids] }
        : {
            type: "query",
            query: selection.query,
            excludedIds: [...selection.excluded],
          },
    [selection],
  );

  return {
    isSelected,
    count:
      selection.type === "ids"
        ? selection.ids.size
        : Math.max(0, total - selection.excluded.size),
    allSelected: selection.type === "query" && selection.excluded.size === 0,
    setSelected,
    toggle,
    selectAll,
    clear,
    request,
  };
};
