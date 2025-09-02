import { FaFilePdf, FaImage, FaVideo } from "react-icons/fa";
import type { FileTypePlugin } from "./fileTypes";

export const pdfPlugin: FileTypePlugin = {
  matcher: (file) => file.type === "application/pdf",
  icon: FaFilePdf,
};

export const imagePlugin: FileTypePlugin = {
  matcher: (file) => file.type.startsWith("image"),
  icon: FaImage,
};

export const videoPlugin: FileTypePlugin = {
  matcher: (file) => file.type.startsWith("video"),
  icon: FaVideo,
};
