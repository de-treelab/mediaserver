import { useMemo } from "react";
import { useFileDownload } from "./useFileDownload";

export const useThumbnail = (id: string) => {
  const url = useMemo(
    () => `${import.meta.env.VITE_BACKEND_URL}/documents/${id}/thumbnail`,
    [id],
  );
  return useFileDownload(url);
};
