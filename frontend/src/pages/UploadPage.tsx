import { useTranslation } from "react-i18next";
import { useUploadContext } from "../upload/UploadContext";

export const UploadPage = () => {
  const { t } = useTranslation();

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
          markFileAsToBeUploaded(file);
        });
      }}
    >
      <h1 className="text-3xl">
        <strong>{t("pages.upload.title")}</strong>
      </h1>
      <p>{t("pages.upload.description")}</p>
    </div>
  );
};
