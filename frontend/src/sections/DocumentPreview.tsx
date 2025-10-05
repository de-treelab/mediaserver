import { useDocument } from "../hooks/useDocument";
import { useDocumentPlugin } from "../hooks/useDocumentPlugin";

type Props = {
  id: string;
};

export const DocumentPreview = ({ id }: Props) => {
  const { objectUrl, blob, isLoading } = useDocument(id);
  const plugin = useDocumentPlugin(blob?.type);

  if (isLoading) {
    return <div className="w-full h-full bg-red-400"></div>;
  }

  if (!blob || !objectUrl) {
    return null;
  }

  return plugin.render(objectUrl);
};
