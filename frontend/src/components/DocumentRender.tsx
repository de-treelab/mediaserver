import React from "react";
import { useDocument } from "../hooks/useDocument";
import { useDocumentPlugin } from "../hooks/useDocumentPlugin";

type Props = {
  documentId: string;
};

export const DocumentRender = ({ documentId }: Props) => {
  const { objectUrl, blob } = useDocument(documentId);
  const plugin = useDocumentPlugin(blob?.type);

  if (!blob || !objectUrl) {
    return null;
  }

  return <plugin.Render objectUrl={objectUrl} React={React} />;
};
