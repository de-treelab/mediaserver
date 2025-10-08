import { useTranslation } from "react-i18next";
import { useUploadContext } from "../upload/UploadContext";
import { TagInput } from "../sections/TagInput";
import { useState } from "react";
import { TagList } from "../components/TagList";
import type { ApiTag } from "../app/api";
import { stringToTag, tagToString } from "../util/tag";

export const UploadPage = () => {
  const { t } = useTranslation();
  const [value, setValue] = useState<string>("");

  const [tags, setTags] = useState<ApiTag[]>([]);

  const { markFileAsToBeUploaded } = useUploadContext();

  return (
    <div
      className="h-full"
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        files.forEach((file) => {
          markFileAsToBeUploaded(file, tags);
        });
      }}
    >
      <h1 className="text-3xl">
        <strong>{t("pages.upload.title")}</strong>
      </h1>
      <p>{t("pages.upload.description")}</p>
      <TagInput
        clearOnSubmit
        value={value}
        onChange={setValue}
        onSubmit={(tag) => {
          if (tag.trim() === "") return;
          setTags((prev) => [...prev, stringToTag(tag)]);
        }}
        className="mb-2"
      />
      <TagList
        tags={tags}
        onDelete={(tag) => {
          setTags((prev) =>
            prev.filter((t) => tagToString(tag) !== tagToString(t)),
          );
        }}
      />
    </div>
  );
};
