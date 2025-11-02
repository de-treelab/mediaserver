import React from "react";
import { useDocument } from "../hooks/useDocument";
import { useDocumentPlugin } from "../hooks/useDocumentPlugin";

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

  if (!blob || !objectUrl) {
    return null;
  }

  return (
    <plugin.Diashow
      objectUrl={objectUrl}
      defaultTimeout={defaultTimeout}
      nextDocument={nextDocument}
      React={React}
    />
  );
};
