import { FileTypePlugin } from "@lars_hagemann/mediaserver-backend-plugin-types";
import * as fs from "fs";

export const plainPlugin: FileTypePlugin = {
  matcher: (file) => file.startsWith("text/plain"),
  thumbnailCreator: async ({ uuidv4 }) => {
    const tmpId = uuidv4();
    const fromPath = "/plainTextThumbnail.jpg";
    const tmpPath = "/tmp/" + tmpId + "_thumbnail.jpg";
    await fs.promises.copyFile(fromPath, tmpPath);

    return { path: tmpPath };
  },
};

export default plainPlugin;
