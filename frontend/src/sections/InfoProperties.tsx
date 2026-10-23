import { useTranslation } from "react-i18next";
import type { Document } from "../app/api";
import { DocumentInfoPluginSections } from "./DocumentInfoPluginSections";
import { SectionLabel } from "../components/SectionLabel";

export const InfoProperties = ({ document }: { document?: Document }) => {
  const { t } = useTranslation();
  const properties: { label: string; value: string }[] = [
    { label: t("document.info.type"), value: document?.mime ?? "—" },
    { label: t("document.info.name"), value: document?.friendlyName ?? "—" },
    {
      label: t("document.info.visibility"),
      value: document
        ? document.isPublic
          ? t("document.info.public")
          : t("document.info.private")
        : "—",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
      <div>
        <SectionLabel className="mb-4">
          {t("document.info.properties")}
        </SectionLabel>
        <div className="flex flex-col gap-3">
          {properties.map(({ label, value }) => (
            <div key={label} className="flex justify-between gap-4 text-sm">
              <span className="text-text-muted flex-shrink-0">{label}</span>
              <span className="text-text-primary font-mono text-xs text-right break-all">
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
      {document && <DocumentInfoPluginSections document={document} />}
    </div>
  );
};
