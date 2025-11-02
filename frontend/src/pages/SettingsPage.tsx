import { useTranslation } from "react-i18next";
import { LanguageSelector } from "../sections/LanguageSelector";
import { fileTypes, reactIcons } from "../plugins/fileTypes";
import { Icon } from "../components/Icon";
import { standardTranslations, translations } from "../i18n";
import { standardPlugins } from "../plugins/standardPlugins";

export const SettingsPage = () => {
  const { t } = useTranslation();

  const languages = Object.keys(translations).filter(
    (lng) => lng !== "languages",
  );

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">{t("settings.title")}</h1>
      <LanguageSelector className="absolute right-4 top-4" />

      <h2 className="text-xl font-semibold mb-2">
        {t("settings.loadedTranslations")}
      </h2>
      {languages.map((lng) => (
        <div key={lng} className="mb-4 p-4 border rounded">
          <span className="font-semibold">{t(`languages.${lng}.name`)}</span> (
          {t(`languages.${lng}.localName`)}) - {t(`languages.${lng}.flag`)}
          <div>
            {t(`settings.languageExtension.trusted`)}:{" "}
            {t(
              "settings.languageExtension." +
                (lng in standardTranslations ? "yes" : "no"),
            )}
          </div>
        </div>
      ))}

      <h2 className="text-xl font-semibold mb-2">
        {t("settings.loadedPlugins")}
      </h2>
      {fileTypes.map((plugin, index) => {
        console.log(plugin);
        console.log(reactIcons);
        return (
          <div key={index} className="mb-4 p-4 border rounded">
            <Icon
              Icon={plugin.icon(reactIcons)}
              size="medium"
              className="inline"
            />
            <span className="ml-2 font-semibold">{plugin.description}</span>
            <div>
              {t(`settings.plugin.trusted`)}:{" "}
              {t(
                "settings.plugin." +
                  (standardPlugins.includes(plugin) ? "yes" : "no"),
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
