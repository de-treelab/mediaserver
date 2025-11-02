import React from "react";
import { useDocument } from "../hooks/useDocument";
import { useDocumentPlugin } from "../hooks/useDocumentPlugin";
import { useIsPluginTrusted } from "../hooks/useIsPluginTrusted";

type Props = {
  documentId: string;
  nextDocument: () => void;
  defaultTimeout?: number;
};

export const DocumentDiashow = ({
  documentId,
  nextDocument,
  defaultTimeout = 3000,
}: Props) => {
  const { objectUrl, blob } = useDocument(documentId);
  const plugin = useDocumentPlugin(blob?.type);

  const isPluginTrusted = useIsPluginTrusted(plugin);

  if (!blob || !objectUrl) {
    return <div>Cannot render document</div>;
  }

  return isPluginTrusted ? (
    <plugin.Diashow
      objectUrl={objectUrl}
      defaultTimeout={defaultTimeout}
      nextDocument={nextDocument}
      React={React}
    />
  ) : (
    <iframe className="w-full h-full">
      <plugin.Diashow
        objectUrl={objectUrl}
        defaultTimeout={defaultTimeout}
        nextDocument={nextDocument}
        React={React}
      />
    </iframe>
  );
};
