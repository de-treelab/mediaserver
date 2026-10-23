import { useTranslation } from "react-i18next";
import { MdOutlineLocalOffer } from "react-icons/md";
import type { ApiTag } from "../app/api";
import { Badge } from "../components/Badge";
import { TagInput } from "../sections/TagInput";
import { tagToString } from "../util/tag";
import { Card } from "../components/Card";
import { SectionLabel } from "../components/SectionLabel";

type Props = {
  tags: ApiTag[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onAdd: (tag: string) => void;
  onRemove: (tag: ApiTag) => void;
};

export const BatchTagsControl = ({
  tags,
  inputValue,
  onInputChange,
  onAdd,
  onRemove,
}: Props) => {
  const { t } = useTranslation();
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <SectionLabel>
          <MdOutlineLocalOffer size={14} />
          {t("pages.upload.batchTagsLabel")}
        </SectionLabel>
        <span className="text-xs text-text-muted">
          {t("pages.upload.batchTagsHint")}
        </span>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        {tags.map((tag) => (
          <Badge key={tagToString(tag)} onDelete={() => onRemove(tag)}>
            <span className="w-1.5 h-1.5 rounded-full bg-accent-subtle shrink-0" />
            {tagToString(tag)}
          </Badge>
        ))}
        <TagInput
          clearOnSubmit
          singleTag
          value={inputValue}
          onChange={onInputChange}
          onSubmit={(tag) => {
            if (tag.trim() !== "") onAdd(tag);
          }}
          placeholder={t("pages.upload.batchTagsInputPlaceholder")}
          className="min-w-48 flex-1"
        />
      </div>
    </Card>
  );
};
