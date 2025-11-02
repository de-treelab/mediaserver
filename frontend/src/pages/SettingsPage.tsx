import { useTranslation } from "react-i18next";
import { LanguageSelector } from "../sections/LanguageSelector";

export const SettingsPage = () => {
  const { t } = useTranslation();

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">{t("settings.title")}</h1>
      <LanguageSelector className="absolute right-4 top-4" />
    </div>
  );
};
