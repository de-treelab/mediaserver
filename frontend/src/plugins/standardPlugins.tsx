import { FaFile, FaFilePdf, FaImage, FaVideo } from "react-icons/fa";
import type { FileTypePlugin } from "./fileTypes";

export const pdfPlugin: FileTypePlugin = {
  matcher: (type) => type === "application/pdf",
  icon: FaFilePdf,
  render: (objectUrl) => (
    <embed className="w-full h-full" src={objectUrl} type="application/pdf" />
  ),
};

export const imagePlugin: FileTypePlugin = {
  matcher: (type) => type.startsWith("image"),
  icon: FaImage,
  render: (objectUrl) => (
    <img
      className="w-full h-full object-contain"
      src={objectUrl}
      alt="Image Preview"
    />
  ),
};

export const videoPlugin: FileTypePlugin = {
  matcher: (type) => type.startsWith("video"),
  icon: FaVideo,
  render: (objectUrl) => (
    <video className="w-full h-full" src={objectUrl} controls />
  ),
};

export const unsupportedTypePlugin: FileTypePlugin = {
  matcher: () => true,
  icon: FaFile,
  render: () => <div>Unsupported file type</div>,
};
