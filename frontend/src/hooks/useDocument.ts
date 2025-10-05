import { useMemo } from "react";
import { useFileDownload } from "./useFileDownload";

export const useDocument = (id: string) => {
  const url = useMemo(
    () => `${import.meta.env.VITE_BACKEND_URL}/documents/${id}`,
    [id],
  );
  return useFileDownload(url);
};
