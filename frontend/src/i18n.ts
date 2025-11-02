import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enTranslation from "../public/translations/en.json";
import deTranslation from "../public/translations/de.json";
import languagesTranslation from "../public/translations/languages.json";

export const standardTranslations = {
  en: {
    translation: enTranslation,
  },
  de: {
    translation: deTranslation,
  },
};

export const translations = {
  ...standardTranslations,

  languages: {
    translation: languagesTranslation,
  },
};

i18n.use(initReactI18next).init({
  fallbackLng: "languages",
  resources: translations,
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
