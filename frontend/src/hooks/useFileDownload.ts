import { useEffect, useState } from "react";

type ObjectMetadata = {
  blob: Blob;
  url: string;
};

const objectMap: Map<string, ObjectMetadata> = new Map();

export const useFileDownload = (url: string) => {
  const [objectUrl, setObjectUrl] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<unknown | undefined>(undefined);
  const [blob, setBlob] = useState<Blob | undefined>(undefined);

  useEffect(() => {
    if (objectMap.has(url)) {
      const metadata = objectMap.get(url)!;
      const { blob, url: objectUrl } = metadata;
      setObjectUrl(objectUrl);
      setBlob(blob);
      setIsLoading(false);
      return;
    }

    fetch(url)
      .then((data) => data.blob())
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        setObjectUrl(objectUrl);
        setBlob(blob);
        objectMap.set(url, { blob, url: objectUrl });
      })
      .catch((error) => setError(error))
      .finally(() => setIsLoading(false));
  }, [url]);

  return { objectUrl, isLoading, error, blob };
};
