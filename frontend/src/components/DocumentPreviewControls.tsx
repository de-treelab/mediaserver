import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FaDownload, FaFile } from "react-icons/fa";
import { LuGalleryHorizontal, LuPresentation } from "react-icons/lu";
import { MdClose, MdEdit, MdInfoOutline } from "react-icons/md";
import { updateDocumentFriendlyName } from "../app/api";
import { enhancedApi } from "../app/enhancedApi";
import { useAppDispatch } from "../app/store";
import { Input } from "./Input";

type Props = {
  documentId: string;
  friendlyName?: string;
  previewImageIndex: number;
  totalDocuments: number;
  mimeType?: string;
  downloadDocument: () => void;
  toggleDiashow: () => void;
  toggleInfoPanel: () => void;
  showInfoPanel: boolean;
  toggleFilmstrip: () => void;
  showFilmstrip: boolean;
  onClose: () => void;
};

export const DocumentPreviewControls: React.FC<Props> = ({
  documentId,
  friendlyName,
  previewImageIndex,
  totalDocuments,
  mimeType,
  downloadDocument,
  toggleDiashow,
  toggleInfoPanel,
  showInfoPanel,
  toggleFilmstrip,
  showFilmstrip,
  onClose,
}) => {
  const ext = mimeType?.split("/")[1];
  const displayName =
    friendlyName || (ext ? `document.${ext}` : documentId.slice(0, 8));
  const current = previewImageIndex + 1;
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(displayName);

  const commitRename = async () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== displayName) {
      await updateDocumentFriendlyName(documentId, trimmed);
      dispatch(enhancedApi.util.invalidateTags(["document"]));
    } else {
      setNameValue(displayName);
    }
    setEditing(false);
  };

  return (
    <div className="flex items-center justify-between px-4 h-full gap-6">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="flex-shrink-0 p-1.5 rounded bg-surface-2 text-text-muted">
          <FaFile size="0.875rem" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            {editing ? (
              <Input
                autoFocus
                inputSize="sm"
                className="text-sm font-semibold"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void commitRename();
                  if (e.key === "Escape") {
                    setNameValue(displayName);
                    setEditing(false);
                  }
                }}
              />
            ) : (
              <>
                <div className="text-sm font-semibold text-text-primary truncate">
                  {displayName}
                </div>
                <button
                  onClick={() => {
                    setNameValue(displayName);
                    setEditing(true);
                  }}
                  className="p-1 rounded hover:bg-surface-2 text-text-faint hover:text-text-muted transition-colors shrink-0"
                  title={t("document.preview.rename")}
                  aria-label={t("document.preview.rename")}
                >
                  <MdEdit size="0.75rem" />
                </button>
              </>
            )}
          </div>
          <div className="text-xs text-text-muted">
            {t("document.preview.position", {
              current,
              total: totalDocuments,
            })}
            {mimeType ? ` · ${mimeType}` : ""}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={downloadDocument}
          title={t("document.preview.download")}
          aria-label={t("document.preview.download")}
          className="p-2 rounded-md hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors"
        >
          <FaDownload size="0.875rem" />
        </button>
        <button
          onClick={toggleDiashow}
          title={t("document.preview.slideshow")}
          aria-label={t("document.preview.slideshow")}
          className="p-2 rounded-md hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors"
        >
          <LuPresentation size="1rem" />
        </button>
        <button
          onClick={toggleFilmstrip}
          title={t("document.preview.toggleFilmstrip")}
          aria-label={t("document.preview.toggleFilmstrip")}
          aria-pressed={showFilmstrip}
          className={`p-2 rounded-md hover:bg-surface-2 transition-colors ${showFilmstrip ? "text-accent-subtle" : "text-text-muted hover:text-text-primary"}`}
        >
          <LuGalleryHorizontal size="1rem" />
        </button>
        <button
          onClick={toggleInfoPanel}
          title={t("document.preview.info")}
          aria-label={t("document.preview.info")}
          aria-pressed={showInfoPanel}
          className={`p-2 rounded-md hover:bg-surface-2 transition-colors ${showInfoPanel ? "text-accent-subtle" : "text-text-muted hover:text-text-primary"}`}
        >
          <MdInfoOutline size="1.25rem" />
        </button>
        <button
          onClick={onClose}
          title={t("document.preview.close")}
          aria-label={t("document.preview.close")}
          className="p-2 rounded-md hover:bg-surface-2 text-text-muted hover:text-danger-subtle transition-colors"
        >
          <MdClose size="1.25rem" />
        </button>
      </div>
    </div>
  );
};
