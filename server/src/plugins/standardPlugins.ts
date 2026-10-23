import sharp from "sharp";
import type { FileTypePlugin } from "./plugin.js";
import * as pdf from "pdf-thumbnail";
import * as fs2 from "fs";
import ffmpeg from "ffmpeg";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export const pdfPlugin: FileTypePlugin = {
  matcher: (file) => file === "application/pdf",
  description: "Plugin for PDF files",
  thumbnailCreator: async ({ path, uuidv4 }) => {
    const tmpId = uuidv4();
    const pdfBuffer = fs2.createReadStream(path);
    try {
      const pdfThumbnailStream = await pdf.default(pdfBuffer, {
        resize: { width: 400, height: 400 },
        crop: {
          width: 400,
          height: 400,
          x: 0,
          y: 0,
          ratio: true,
        },
        compress: { type: "JPEG" },
      });
      const pdfJpegBuffer = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        pdfThumbnailStream.on("data", (chunk) => chunks.push(chunk));
        pdfThumbnailStream.on("end", () => resolve(Buffer.concat(chunks)));
        pdfThumbnailStream.on("error", reject);
      });
      const thumbnailBuffer = await sharp(pdfJpegBuffer)
        .webp({ quality: 80 })
        .toBuffer();
      const tmpPath = "/tmp/" + tmpId + "_thumbnail.webp";
      // Async write so a burst of PDF uploads doesn't block the event loop
      // (which would stall concurrent document/thumbnail downloads).
      await fs2.promises.writeFile(tmpPath, thumbnailBuffer);
      return { path: tmpPath };
    } finally {
      // Release the input descriptor even if PDF parsing or sharp throws —
      // otherwise a failed PDF thumbnail leaks an FD on every upload.
      pdfBuffer.destroy();
    }
  },
  initialTags: async () => {
    return [];
  },
};

export const imagePlugin: FileTypePlugin = {
  matcher: (file) => file.startsWith("image"),
  description: "Plugin for image files",
  thumbnailCreator: async ({ path, uuidv4 }) => {
    // Implement image thumbnail creation logic
    const tmpId = uuidv4();
    const tmpPath = "/tmp/" + tmpId + "_thumbnail.webp";
    await sharp(path)
      .rotate()
      .resize(400, 400, {
        fit: "inside",
      })
      .webp({ quality: 80 })
      .toFile(tmpPath);

    return { path: tmpPath };
  },
  initialTags: async () => {
    return [];
  },
};

export const videoPlugin: FileTypePlugin = {
  matcher: (file) => file.startsWith("video"),
  description: "Plugin for video files",
  thumbnailCreator: async ({ path, uuidv4 }) => {
    const video = await new ffmpeg(path);
    const outPath = "/tmp/" + uuidv4() + ".jpg";
    // Seek to the middle of the video so the thumbnail is representative of the
    // content rather than the (often black/blank) first frame. Falls back to
    // the start when the duration could not be parsed from the metadata.
    const durationSeconds = video.metadata.duration?.seconds ?? 0;
    const seekSeconds = Math.floor(durationSeconds / 2);
    // The `ffmpeg` library always emits `ffmpeg -i <input> …`, so a seek added
    // through it lands *after* `-i` (slow, decode-from-start output seeking).
    // Invoke ffmpeg directly to place `-ss` *before* `-i` for fast input-side
    // seeking, then grab a single frame, scale into a 400x400 box with black
    // padding, and convert to full-range YUV (yuvj420p). The mjpeg encoder in
    // ffmpeg 8.0 refuses limited-range ("tv") YUV input, which most videos use.
    await execFileAsync("ffmpeg", [
      "-ss",
      String(seekSeconds),
      "-i",
      path,
      "-frames:v",
      "1",
      "-filter_complex",
      "scale=400:400:force_original_aspect_ratio=decrease," +
        "pad=400:400:(ow-iw)/2:(oh-ih)/2:black," +
        "format=yuvj420p",
      "-y",
      outPath,
    ]);

    return { path: outPath };
  },
  initialTags: async () => {
    return [];
  },
};

export const audioPlugin: FileTypePlugin = {
  matcher: (file) => file.startsWith("audio"),
  description: "Plugin for audio files",
  thumbnailCreator: async ({ path, uuidv4 }) => {
    const process = await new ffmpeg(path);
    const filename = uuidv4();
    process.addFilterComplex(
      "[0:a]aformat=channel_layouts=mono," +
        "compand=gain=-6," +
        "showwavespic=s=400x400:colors=#9cf42f[fg];" +
        "color=s=400x400:color=#44582c," +
        "drawgrid=width=iw/10:height=ih/5:color=#9cf42f@0.1[bg];" +
        "[bg][fg]overlay=format=auto,drawbox=x=(iw-w)/2:y=(ih-h)/2:w=iw:h=1:color=#9cf42f",
    );
    process.addCommand("-frames:v", "1");
    await process.save("/tmp/" + filename + ".jpg");

    return { path: "/tmp/" + filename + ".jpg" };
  },
  initialTags: async () => {
    return [];
  },
};

export const standardPlugins = {
  pdf: pdfPlugin,
  image: imagePlugin,
  video: videoPlugin,
  audio: audioPlugin,
};
