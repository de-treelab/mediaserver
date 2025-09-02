import { createContext, useContext } from "react";

export type FileProxy = {
  type: string;
  name: string;
  status: "prepared" | "uploading" | "success" | "failed";
  errorReason?: string;
};

type UploadContextType = {
  toBeUploaded: Set<File>;
  toBeProcessed: Set<FileProxy>;
  processedFiles: Set<FileProxy>;
  failedFiles: Set<FileProxy>;

  markFileAsToBeUploaded: (file: File) => void;
  markFileAsBeingProcessed: (file: string) => void;
  markFileAsProcessed: (file: string) => void;
  markFileAsFailed: (file: string, errorReason: string) => void;
};

export const UploadContext = createContext<UploadContextType | undefined>(
  undefined,
);

export const useUploadContext = () => {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error("useUploadContext must be used within an UploadProvider");
  }
  return context;
};
