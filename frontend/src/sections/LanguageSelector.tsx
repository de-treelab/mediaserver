import i18n from "i18next";
import { IoMdGlobe } from "react-icons/io";
import { translations } from "../i18n";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { twMerge } from "tailwind-merge";
import { useAppDispatch } from "../app/store";
import { setLanguage } from "../app/persistent.slice";

type Props = {
  className?: string;
};

export const LanguageSelector = ({ className }: Props) => {
  const { t } = useTranslation();

  const [hovered, setHovered] = useState(false);

  const dispatch = useAppDispatch();

  const language = i18n.language;
  const languages = Object.keys(translations).filter(
    (lng) => lng !== "languages",
  );

  return (
    <div
      className={twMerge("relative cursor-pointer", className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="text-xl">{t(`languages.${language}.flag`)}</span>{" "}
      <IoMdGlobe className="inline" size="1.75em" />
      <div
        className={twMerge(
          "absolute top-full right-0 p-1 bg-gray-700 gap-2 w-60",
          hovered ? "inline" : "hidden",
        )}
      >
        <div className="flex flex-col">
          <div className="p-1 font-bold border-b border-gray-500 mb-1">
            {t("settings.selectLanguage")}
          </div>
        </div>
        {languages.map((lng) => (
          <div
            className="p-1 hover:bg-gray-600 flex flex-row flex-nowrap gap-2 text-lg"
            key={lng}
            onClick={() => dispatch(setLanguage(lng))}
          >
            <div className="flex ">{t(`languages.${lng}.name`)}</div>
            <div className="flex ">({t(`languages.${lng}.localName`)})</div>
            <div className="flex grow justify-end">
              {t(`languages.${lng}.flag`)}
            </div>
          </div>
        ))}
      </div>
      {/* <br />
      <select
        value={language}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
      >
        {languages.map((lng) => (
          <option key={lng} value={lng}>
            {t(`languages.${lng}.flag`)} {t(`languages.${lng}.name`)} (
            {t(`languages.${lng}.localName`)})
          </option>
        ))}
      </select> */}
    </div>
  );
};
