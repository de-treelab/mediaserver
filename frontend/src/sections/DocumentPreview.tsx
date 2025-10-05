import { twMerge } from "tailwind-merge";
import { enhancedApi } from "../app/enhancedApi";
import { TagList } from "../components/TagList";
import { useDocument } from "../hooks/useDocument";
import { useDocumentPlugin } from "../hooks/useDocumentPlugin";
import { useEffect, useState } from "react";

type Props = {
  id: string;
};

export const DocumentPreview = ({ id }: Props) => {
  const { objectUrl, blob } = useDocument(id);
  const plugin = useDocumentPlugin(blob?.type);

  const [tagListOpen, setTagListOpen] = useState(false);

  useEffect(() => {
    const keyDownHandler = (event: KeyboardEvent) => {
      if (event.key === "t") {
        setTagListOpen((open) => !open);
      }
    };

    window.addEventListener("keydown", keyDownHandler);
    return () => {
      window.removeEventListener("keydown", keyDownHandler);
    };
  }, []);

  const { data } = enhancedApi.useGetDocumentTagsQuery(id);

  if (!blob || !objectUrl) {
    return null;
  }

  return (
    <>
      <div
        className={twMerge(
          "absolute top-0 w-1/4 h-full z-0 bg-gray-800 p-2 border-b-2 border-gray-700 duration-200",
          tagListOpen ? "left-0" : "-left-1/4",
        )}
      >
        <TagList tags={data?.tags || []} onClick={() => {}} />
      </div>
      <div
        className={twMerge(
          "absolute top-1/2 z-100 bg-gray-700 p-2 border-r-2 border-r-transparent rounded-r-md duration-200 cursor-pointer",
          tagListOpen ? "left-1/4" : "left-0",
        )}
        onClick={() => setTagListOpen((open) => !open)}
      >
        <div className={tagListOpen ? "rotate-180" : "rotate-0"}>&gt;</div>
      </div>
      <div
        className={twMerge(
          "absolute top-0 h-full z-0 bg-gray-900 duration-200",
          tagListOpen ? "w-3/4 left-1/4" : "w-full left-0",
        )}
      >
        {plugin.render(objectUrl)}
      </div>
    </>
  );
};
