import { useTranslation } from "react-i18next";

export const UnsupportedFileType = () => {
  const { t } = useTranslation();
  return <div>{t("document.preview.unsupportedFileType")}</div>;
};
