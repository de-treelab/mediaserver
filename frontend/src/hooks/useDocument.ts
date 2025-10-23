import { useFileDownload } from "./useFileDownload";
import { useDocumentUrl } from "./useDocumentUrl";

export const useDocument = (id: string) => {
  const url = useDocumentUrl(id);
  return useFileDownload(url);
};
