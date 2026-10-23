import { useState } from "react";
import { useTranslation } from "react-i18next";
import { twMerge } from "tailwind-merge";
import { AddDocumentToCollection } from "./AddDocumentToCollection";
import { DocumentAccessPanel } from "./DocumentAccessPanel";
import { DocumentTagsPanel } from "./DocumentTagsPanel";
import { InfoProperties } from "./InfoProperties";
import type { Document } from "../app/api";
import { Tabs } from "../components/Tabs";

type Tab = "info" | "tags" | "collections" | "access";

type Props = {
  documentId: string;
  currentDocument?: Document;
  canManageAccess: boolean;
  className?: string;
};

export const DocumentInfoPanel = ({
  documentId,
  currentDocument,
  canManageAccess,
  className,
}: Props) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("info");

  const tabs: Tab[] = [
    "info",
    "tags",
    "collections",
    ...(canManageAccess ? (["access"] as Tab[]) : []),
  ];

  return (
    <div
      className={twMerge(
        "w-80 xl:w-96 flex-shrink-0 h-full border-l border-border bg-surface-1 flex flex-col",
        className,
      )}
    >
      <Tabs
        fill
        className="flex-shrink-0"
        currentTab={activeTab}
        onTabChange={setActiveTab}
        tabs={tabs.map((tab) => ({
          tabId: tab,
          node: t(`document.tabs.${tab}`),
        }))}
      />
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === "info" && <InfoProperties document={currentDocument} />}
        {activeTab === "tags" && <DocumentTagsPanel documentId={documentId} />}
        {activeTab === "collections" && (
          <div className="flex-1 overflow-y-auto p-4">
            <AddDocumentToCollection documentId={documentId} />
          </div>
        )}
        {activeTab === "access" && (
          <div className="flex-1 overflow-y-auto">
            <DocumentAccessPanel documentId={documentId} />
          </div>
        )}
      </div>
    </div>
  );
};
