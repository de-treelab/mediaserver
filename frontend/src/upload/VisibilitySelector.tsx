import { useTranslation } from "react-i18next";
import { MdLock, MdOutlineVisibility, MdPublic } from "react-icons/md";
import { ButtonSelector } from "../components/ButtonSelector";
import { Card } from "../components/Card";
import { SectionLabel } from "../components/SectionLabel";

export type Visibility = "private" | "public";

type Props = {
  value: Visibility;
  onChange: (value: Visibility) => void;
};

export const VisibilitySelector = ({ value, onChange }: Props) => {
  const { t } = useTranslation();
  return (
    <Card>
      <SectionLabel className="mb-3">
        <MdOutlineVisibility size={14} />
        {t("pages.upload.visibilityLabel")}
      </SectionLabel>
      <ButtonSelector
        className="mb-3"
        multiChoice={false}
        value={value}
        onSelected={(v) => onChange(v as Visibility)}
        options={[
          {
            value: "private",
            label: (
              <>
                <MdLock size={15} /> {t("pages.upload.private")}
              </>
            ),
          },
          {
            value: "public",
            label: (
              <>
                <MdPublic size={15} /> {t("pages.upload.public")}
              </>
            ),
          },
        ]}
      />
      <p className="text-sm text-text-muted leading-snug">
        {value === "private" ? (
          <>
            <strong className="text-text-secondary">
              {t("pages.upload.private")}
            </strong>{" "}
            — {t("pages.upload.privateDescription")}
          </>
        ) : (
          <>
            <strong className="text-text-secondary">
              {t("pages.upload.public")}
            </strong>{" "}
            — {t("pages.upload.publicDescription")}
          </>
        )}
      </p>
    </Card>
  );
};
