import { useTranslation } from "react-i18next";
import { Modal } from "../components/Modal";
import { ButtonSelector } from "../components/ButtonSelector";
import { useCallback, useEffect, useMemo, useState } from "react";
import { enhancedApi } from "../app/enhancedApi";
import { TagList } from "../components/TagList";
import { TagInput } from "./TagInput";
import { skipToken } from "@reduxjs/toolkit/query";
import type { ApiTag, DocumentSelection } from "../app/api";
import { Button } from "../components/Button";
import { CollectionCard } from "./CollectionCard";
import { BiLoader } from "react-icons/bi";
import { tagToString, stringToTag } from "../util/tag";
import { Input } from "../components/Input";

type Props = {
  selection: DocumentSelection;
  // Number of selected documents as known before the server counted them
  count: number;
  isOpen: boolean;
  onConfirm: () => void;
  onAbort: () => void;
};

export const BulkEditDocumentsModal = ({
  selection,
  count,
  isOpen,
  onConfirm,
  onAbort,
}: Props) => {
  const { t } = useTranslation();
  const [selectedAction, setSelectedAction] = useState<"collection" | "tag">(
    "tag",
  );

  // Counted by the server, as selecting all doesn't come with the ids
  const { data: selectionTags } = enhancedApi.useListSelectionTagsQuery(
    isOpen ? selection : skipToken,
  );
  const selectedCount = selectionTags?.total;
  const { data: fetchedTags } = enhancedApi.useListTagsQuery({
    limit: 1000,
    offset: 0,
  });
  const { data: collections } = enhancedApi.useListCollectionsQuery({
    limit: 1000,
    offset: 0,
  });

  const [tagsToAdd, setTagsToAdd] = useState<ApiTag[]>([]);
  const [tagsToRemove, setTagsToRemove] = useState<ApiTag[]>([]);

  useEffect(() => {
    if (isOpen) {
      setTagsToAdd([]);
      setTagsToRemove([]);
    }
  }, [isOpen]);

  const allTagsWithUsage = useMemo(() => {
    if (!selectionTags) return [];
    const n = selectionTags.total;

    const tagsMap: Record<string, ApiTag & { usageCount: number }> = {};
    fetchedTags?.items.forEach((tag) => {
      tagsMap[tagToString(tag)] = { ...tag, usageCount: 0 };
    });
    const originalCounts = new Map<string, number>();
    selectionTags.tags.forEach(({ usageCount, ...tag }) => {
      const k = tagToString(tag);
      originalCounts.set(k, usageCount);
      if (!(k in tagsMap)) tagsMap[k] = { ...tag, usageCount: 0 };
    });
    tagsToAdd.forEach((tag) => {
      const k = tagToString(tag);
      if (!(k in tagsMap)) tagsMap[k] = { ...tag, usageCount: 0 };
    });

    return Object.values(tagsMap).map((tag) => {
      const k = tagToString(tag);
      const originalCount = originalCounts.get(k) ?? 0;
      const pendingAdd = tagsToAdd.some((t) => tagToString(t) === k);
      const pendingRemove = tagsToRemove.some((t) => tagToString(t) === k);
      return {
        ...tag,
        usageCount: pendingAdd ? n : pendingRemove ? 0 : originalCount,
      };
    });
  }, [selectionTags, fetchedTags, tagsToAdd, tagsToRemove]);

  const tags = useMemo(() => {
    return allTagsWithUsage.filter(
      (tag) =>
        tag.type !== "collection" &&
        tag.type !== "meta" &&
        tag.key !== "collection",
    );
  }, [allTagsWithUsage]);

  const sharedTags = useMemo(() => {
    return tags.filter((tag) => tag.usageCount === selectedCount);
  }, [tags, selectedCount]);

  const sharedCollections = useMemo(() => {
    return allTagsWithUsage.filter(
      (tag) =>
        (tag.key === "collection" || tag.type === "collection") &&
        tag.usageCount === selectedCount,
    );
  }, [allTagsWithUsage, selectedCount]);

  const [collectionFilter, setCollectionFilter] = useState("");
  const [query, setQuery] = useState("");

  const filteredCollections = useMemo(() => {
    const lowerFilter = collectionFilter.toLowerCase();
    return (
      collections?.items.filter(
        (collection) =>
          collection.type === "static" &&
          collection.name.toLowerCase().includes(lowerFilter),
      ) || []
    );
  }, [collections, collectionFilter]);

  const toggleTag = useCallback(
    (tag: ApiTag) => {
      const key = tagToString(tag);
      const isShared =
        sharedTags.some((t) => tagToString(t) === key) ||
        sharedCollections.some((t) => tagToString(t) === key);
      const isPendingAdd = tagsToAdd.some((t) => tagToString(t) === key);
      const isPendingRemove = tagsToRemove.some((t) => tagToString(t) === key);

      if (isShared && !isPendingRemove) {
        setTagsToRemove((prev) => [...prev, tag]);
      } else if (isShared && isPendingRemove) {
        setTagsToRemove((prev) => prev.filter((t) => tagToString(t) !== key));
      } else if (!isShared && isPendingAdd) {
        setTagsToAdd((prev) => prev.filter((t) => tagToString(t) !== key));
      } else {
        setTagsToAdd((prev) => [
          ...prev,
          { key: tag.key, value: tag.value, type: tag.type },
        ]);
      }
    },
    [sharedTags, sharedCollections, tagsToAdd, tagsToRemove],
  );

  const onSubmit = useCallback(
    (query: string) => {
      toggleTag(stringToTag(query));
      setQuery("");
    },
    [toggleTag],
  );

  const [bulkEditDocuments, { isLoading }] =
    enhancedApi.useBulkEditDocumentsMutation();

  const onBulkEditConfirm = useCallback(() => {
    bulkEditDocuments({
      selection,
      tagsToAdd,
      tagsToRemove,
    }).then(() => {
      onConfirm();
    });
  }, [tagsToAdd, tagsToRemove, bulkEditDocuments, selection, onConfirm]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onAbort}
      title={t("pages.gallery.bulkEditDocuments", {
        count: selectedCount ?? count,
      })}
    >
      <div className="flex flex-col gap-2 min-h-[400px]">
        <ButtonSelector
          options={[
            { label: t("pages.gallery.editTags"), value: "tag" },
            { label: t("pages.gallery.editCollections"), value: "collection" },
          ]}
          value={selectedAction}
          onSelected={(value) =>
            setSelectedAction(value as "collection" | "tag")
          }
          multiChoice={false}
        />
        <div className="flex-grow flex flex-col gap-2">
          {selectedAction === "tag" ? (
            <>
              <TagInput
                className="z-100"
                singleTag
                onChange={setQuery}
                placeholder={t("pages.gallery.searchTag")}
                value={query}
                onSubmit={onSubmit}
              />
              <TagList tags={tags} onClick={toggleTag} />
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <Input
                type="text"
                placeholder={t("collections.addForm.filterPlaceholder")}
                value={collectionFilter}
                onChange={(e) => setCollectionFilter(e.target.value)}
              />
              {filteredCollections.map((collection) => (
                <CollectionCard
                  collection={collection}
                  key={collection.id}
                  isSelected={sharedCollections.some(
                    (tag) =>
                      tag.key === "collection" && tag.value === collection.id,
                  )}
                  onClick={() => {
                    const tag = {
                      key: "collection",
                      value: collection.id,
                      type: "collection",
                    } as ApiTag;
                    toggleTag(tag);
                  }}
                />
              ))}
            </div>
          )}
        </div>
        <Button
          onClick={onBulkEditConfirm}
          className="self-end"
          disabled={isLoading || (!tagsToAdd.length && !tagsToRemove.length)}
        >
          {isLoading ? <BiLoader className="animate-spin" /> : undefined}
          {t("pages.gallery.bulkEditConfirm", {
            count: selectedCount ?? count,
          })}
        </Button>
      </div>
    </Modal>
  );
};
