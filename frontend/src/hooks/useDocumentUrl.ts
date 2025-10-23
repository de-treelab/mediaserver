import { useMemo } from "react";

export const useDocumentUrl = (id: string) => {
  const url = useMemo(
    () => `${import.meta.env.VITE_BACKEND_URL}/documents/${id}`,
    [id],
  );
  return url;
};
