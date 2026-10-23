import { useTranslation } from "react-i18next";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { pageGutter } from "../components/styles";

type Props = {
  editDocuments: Set<string>;
  entirePageSelected: boolean;
  onTogglePage: () => void;
  onClearSelection: () => void;
  onOpenBulkEdit: () => void;
  onCancel: () => void;
};

export const EditModePanel = ({
  editDocuments,
  entirePageSelected,
  onTogglePage,
  onClearSelection,
  onOpenBulkEdit,
  onCancel,
}: Props) => {
  const { t } = useTranslation();

  return (
    <div className={pageGutter}>
      <Card className="flex flex-col gap-3 p-3 text-sm text-text-primary">
        <div className="flex flex-row gap-2 items-center justify-start flex-wrap">
          <div className="flex flex-row gap-2 items-center">
            <div className="w-3 h-3 rounded-full bg-accent-subtle border-accent border-3" />
            <span className="font-medium">{t("pages.gallery.editMode")}</span>
          </div>
          <div className="flex flex-grow justify-end">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              {t("pages.gallery.cancelEdit")}
            </Button>
          </div>
        </div>
        <div className="flex flex-row gap-2 items-center justify-start flex-wrap border-t border-border pt-3">
          <span className="px-2 py-0.5 rounded-full bg-accent-dim text-accent-muted text-xs font-medium">
            {editDocuments.size} {t("pages.gallery.selected")}
          </span>
          <Button variant="outline" size="sm" onClick={onTogglePage}>
            {entirePageSelected
              ? t("pages.gallery.deselectPage")
              : t("pages.gallery.selectPage")}
          </Button>
          <Button variant="outline" size="sm" onClick={onClearSelection}>
            {t("pages.gallery.clearSelection")}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenBulkEdit}
            disabled={editDocuments.size === 0}
          >
            {t("pages.gallery.bulkEdit")}
          </Button>
          <div className="flex flex-grow justify-end text-text-muted">
            {t("pages.gallery.editDescription")}
          </div>
        </div>
      </Card>
    </div>
  );
};
