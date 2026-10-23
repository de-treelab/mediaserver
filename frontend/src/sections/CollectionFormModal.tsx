import { useState, useEffect } from "react";
import { Modal, ModalActions } from "../components/Modal";
import { TagInput } from "./TagInput";
import { enhancedApi } from "../app/enhancedApi";
import { api } from "../app/api";
import type { Collection, CollectionType } from "../app/api";
import { useTranslation } from "react-i18next";
import { Button } from "../components/Button";
import { FaGlobe, FaLock, FaTimes } from "react-icons/fa";
import { usePermission, useIdentity } from "../hooks/usePermission";
import { FormField, Input, Select, Textarea } from "../components/Input";
import { ButtonSelector } from "../components/ButtonSelector";

type SaveData = {
  name: string;
  description: string | null;
  filterExpression: string;
  isFavorite: boolean;
  type: CollectionType;
  isPublic: boolean;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SaveData) => void;
  initialCollection?: Collection;
  initialFilterExpression?: string;
};

export const CollectionFormModal = ({
  isOpen,
  onClose,
  onSave,
  initialCollection,
  initialFilterExpression = "",
}: Props) => {
  const { t } = useTranslation();
  const { data: identity } = useIdentity();
  const isAdmin = usePermission("admin:users");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [filterExpression, setFilterExpression] = useState("");
  const [isFilterValid, setIsFilterValid] = useState(true);
  const [type, setType] = useState<CollectionType>("dynamic");
  const [isPublic, setIsPublic] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState("");

  const isEditing = !!initialCollection;
  const effectiveType = isEditing ? initialCollection.type : type;
  const showTypeSelector = !isEditing && !initialFilterExpression;

  useEffect(() => {
    if (isOpen) {
      setName(initialCollection?.name ?? "");
      setDescription(initialCollection?.description ?? "");
      setFilterExpression(
        initialCollection?.filterExpression ?? initialFilterExpression,
      );
      setIsFilterValid(true);
      setType(initialCollection?.type ?? "dynamic");
      setIsPublic(initialCollection?.isPublic ?? true);
      setSelectedUserId("");
    }
  }, [isOpen, initialCollection, initialFilterExpression]);

  const { data: previewData } = enhancedApi.useListDocumentsQuery(
    { limit: 1, query: filterExpression },
    {
      skip:
        effectiveType === "static" || !isFilterValid || filterExpression === "",
      refetchOnFocus: true,
      refetchOnReconnect: true,
    },
  );

  const { data: access, isLoading: isAccessLoading } =
    api.useGetCollectionAccessQuery(initialCollection?.id ?? "", {
      skip: !isEditing || !isOpen,
    });

  const { data: usersData } = api.useListUsersQuery(undefined, {
    skip: !isAdmin || !isEditing,
  });

  const [updateAccess] = api.useUpdateCollectionAccessMutation();

  const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

  const isValid =
    name.trim().length > 0 && (effectiveType === "static" || isFilterValid);

  const handleSave = () => {
    if (!isValid) return;
    onSave({
      name: name.trim(),
      description: description.trim() || null,
      filterExpression,
      isFavorite: initialCollection?.isFavorite ?? false,
      type: effectiveType,
      isPublic,
    });
  };

  const handleRemoveShare = (userId: string) => {
    if (!access || !initialCollection) return;
    void updateAccess({
      id: initialCollection.id,
      isPublic: access.isPublic,
      sharedWith: access.shares
        .map((s) => s.userId)
        .filter((id) => id !== userId),
    });
  };

  const handleAddShare = () => {
    if (!access || !initialCollection || !selectedUserId) return;
    const shareUserIds = new Set(access.shares.map((s) => s.userId));
    if (shareUserIds.has(selectedUserId)) return;
    void updateAccess({
      id: initialCollection.id,
      isPublic: access.isPublic,
      sharedWith: [...access.shares.map((s) => s.userId), selectedUserId],
    });
    setSelectedUserId("");
  };

  const title = isEditing
    ? t("collections.editCollection")
    : t("collections.newCollection");

  const canManageAccess =
    isEditing && access && (isAdmin || access.ownerId === identity?.userId);

  const ownerUser = usersData?.users.find((u) => u.id === access?.ownerId);
  const ownerLabel = ownerUser
    ? (ownerUser.name ?? ownerUser.email ?? ownerUser.externalId)
    : access?.ownerId === SYSTEM_USER_ID
      ? "System"
      : access?.ownerId === identity?.userId
        ? (identity?.name ?? identity?.email ?? t("common.you"))
        : access?.ownerId;

  const shareUserIds = new Set(access?.shares.map((s) => s.userId) ?? []);
  const availableToAdd =
    usersData?.users.filter(
      (u) => u.id !== access?.ownerId && !shareUserIds.has(u.id),
    ) ?? [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex flex-col gap-4">
        {showTypeSelector && (
          <FormField
            label={t("collections.form.type")}
            hint={
              type === "dynamic"
                ? t("collections.form.typeDynamicHint")
                : t("collections.form.typeStaticHint")
            }
          >
            <ButtonSelector
              multiChoice={false}
              value={type}
              onSelected={(v) => setType(v as "dynamic" | "static")}
              options={[
                { value: "dynamic", label: t("collections.form.typeDynamic") },
                { value: "static", label: t("collections.form.typeStatic") },
              ]}
            />
          </FormField>
        )}

        <FormField label={`${t("collections.form.name")} *`}>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("collections.form.namePlaceholder")}
          />
        </FormField>

        <FormField label={t("collections.form.description")}>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-20"
            placeholder={t("collections.form.descriptionPlaceholder")}
          />
        </FormField>

        {effectiveType === "dynamic" && (
          <FormField
            label={`${t("collections.form.filterExpression")} *`}
            hint={
              isFilterValid &&
              filterExpression !== "" &&
              t("collections.docCount", { count: previewData?.total ?? 0 })
            }
          >
            <TagInput
              value={filterExpression}
              onChange={setFilterExpression}
              onSubmit={() => {}}
              onValidChange={setIsFilterValid}
              placeholder={t("collections.form.filterPlaceholder")}
            />
          </FormField>
        )}

        {effectiveType === "static" && isEditing && (
          <p className="text-xs text-text-muted">
            {t("collections.form.staticFilterNote")}
          </p>
        )}

        <FormField
          label={t("collection.access.title")}
          hint={
            isPublic
              ? t("collection.access.publicDescription")
              : t("collection.access.privateDescription")
          }
        >
          <ButtonSelector
            multiChoice={false}
            value={isPublic ? "public" : "private"}
            onSelected={(v) => setIsPublic(v === "public")}
            options={[
              {
                value: "public",
                label: (
                  <>
                    <FaGlobe size={12} />
                    {t("collection.access.public")}
                  </>
                ),
              },
              {
                value: "private",
                label: (
                  <>
                    <FaLock size={12} />
                    {t("collection.access.private")}
                  </>
                ),
              },
            ]}
          />
        </FormField>

        {isEditing && !isAccessLoading && canManageAccess && !isPublic && (
          <FormField label={t("collection.access.sharedWith")}>
            <div className="flex flex-col gap-1">
              {(access?.shares.length ?? 0) === 0 && (
                <div className="text-text-muted italic text-sm">
                  {t("collection.access.noShares")}
                </div>
              )}
              {access?.shares.map((share) => (
                <div
                  key={share.userId}
                  className="flex items-center justify-between px-3 py-2 rounded-md border border-border"
                >
                  <span className="text-sm">
                    {share.name ?? share.email ?? share.userId}
                  </span>
                  <button
                    onClick={() => handleRemoveShare(share.userId)}
                    className="text-danger-subtle hover:text-danger p-1 rounded transition-colors"
                    title={t("collection.access.removeUser")}
                  >
                    <FaTimes size={12} />
                  </button>
                </div>
              ))}
            </div>
            {isAdmin && availableToAdd.length > 0 && (
              <div className="mt-2 flex gap-2">
                <Select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="flex-1"
                >
                  <option value="">{t("collection.access.addUser")}</option>
                  {availableToAdd.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name ?? u.email ?? u.externalId}
                    </option>
                  ))}
                </Select>
                <Button
                  size="sm"
                  onClick={handleAddShare}
                  disabled={!selectedUserId}
                >
                  +
                </Button>
              </div>
            )}
            {isAdmin && access && (
              <div className="mt-2 text-xs text-text-secondary">
                {t("collection.access.owner")}:{" "}
                <span className="text-text-primary">{ownerLabel}</span>
              </div>
            )}
          </FormField>
        )}

        <ModalActions>
          <Button variant="ghost" onClick={onClose}>
            {t("collections.form.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            {t("collections.form.save")}
          </Button>
        </ModalActions>
      </div>
    </Modal>
  );
};
