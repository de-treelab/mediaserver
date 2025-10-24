import {
  FaFile,
  FaFileAudio,
  FaFilePdf,
  FaImage,
  FaVideo,
} from "react-icons/fa";
import type { FileTypePlugin } from "./fileTypes";
import { useEffect, useRef } from "react";

export const pdfPlugin: FileTypePlugin = {
  matcher: (type) => type === "application/pdf",
  icon: FaFilePdf,
  Render: ({ objectUrl }) => (
    <embed className="w-full h-full" src={objectUrl} type="application/pdf" />
  ),
  Diashow: (context) => {
    useEffect(() => {
      const timeout = setTimeout(() => {
        context.nextDocument();
      }, context.defaultTimeout);

      return () => clearTimeout(timeout);
    }, [context]);

    return (
      <embed
        className="w-full h-full"
        src={context.objectUrl}
        type="application/pdf"
      />
    );
  },
};

export const imagePlugin: FileTypePlugin = {
  matcher: (type) => type.startsWith("image"),
  icon: FaImage,
  Render: ({ objectUrl }) => (
    <img
      className="w-full h-full object-contain"
      src={objectUrl}
      alt="Image Preview"
    />
  ),
  Diashow: (context) => {
    useEffect(() => {
      const timeout = setTimeout(() => {
        context.nextDocument();
      }, context.defaultTimeout);

      return () => clearTimeout(timeout);
    }, [context]);

    return (
      <img
        className="w-full h-full object-contain"
        src={context.objectUrl}
        alt="Image Preview"
      />
    );
  },
};

export const videoPlugin: FileTypePlugin = {
  matcher: (type) => type.startsWith("video"),
  icon: FaVideo,
  Render: ({ objectUrl }) => (
    <video className="w-full h-full" src={objectUrl} controls />
  ),
  Diashow: (context) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
      videoRef.current?.play();

      videoRef.current?.addEventListener("ended", () => {
        context.nextDocument();
      });
    }, [context]);

    return (
      <video
        className="w-full h-full"
        src={context.objectUrl}
        controls
        loop={false}
        ref={videoRef}
      />
    );
  },
};

export const audioPlugin: FileTypePlugin = {
  matcher: (type) => type.startsWith("audio"),
  icon: FaFileAudio,
  Render: ({ objectUrl }) => (
    <audio className="w-full h-full" src={objectUrl} controls />
  ),
  Diashow: (context) => {
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
      audioRef.current?.play();

      audioRef.current?.addEventListener("ended", () => {
        context.nextDocument();
      });
    }, [context]);

    return (
      <audio
        className="w-full h-full"
        src={context.objectUrl}
        controls
        loop={false}
        ref={audioRef}
      />
    );
  },
};

export const standardPlugins = [
  imagePlugin,
  videoPlugin,
  pdfPlugin,
  audioPlugin,
];

export const unsupportedTypePlugin: FileTypePlugin = {
  matcher: () => true,
  icon: FaFile,
  Render: () => <div>Unsupported file type</div>,
  Diashow: (context) => {
    useEffect(() => {
      context.nextDocument();
    }, [context]);

    return <div>Unsupported file type</div>;
  },
};
