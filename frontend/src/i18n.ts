import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enTranslation from "../public/translations/en.json";

i18n.use(initReactI18next).init({
  fallbackLng: "en",
  resources: {
    en: {
      translation: enTranslation,
    },
  },
});

export default i18n;
