import React from "react";
import { useDocument } from "../hooks/useDocument";
import { useDocumentPlugin } from "../hooks/useDocumentPlugin";
import { useIsPluginTrusted } from "../hooks/useIsPluginTrusted";

type Props = {
  documentId: string;
};

export const DocumentRender = ({ documentId }: Props) => {
  const { objectUrl, blob } = useDocument(documentId);
  const plugin = useDocumentPlugin(blob?.type);

  const isPluginTrusted = useIsPluginTrusted(plugin);

  if (!blob || !objectUrl) {
    return <div>Cannot render document</div>;
  }

  return isPluginTrusted ? (
    <plugin.Render objectUrl={objectUrl} React={React} />
  ) : (
    <iframe className="w-full h-full">
      <plugin.Render objectUrl={objectUrl} React={React} />
    </iframe>
  );
};
