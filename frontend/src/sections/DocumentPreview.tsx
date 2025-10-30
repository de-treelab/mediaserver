import { twMerge } from "tailwind-merge";
import { enhancedApi } from "../app/enhancedApi";
import { TagList } from "../components/TagList";
import { useDocument } from "../hooks/useDocument";
import { useDocumentPlugin } from "../hooks/useDocumentPlugin";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { TagInput } from "./TagInput";
import type { ApiTag } from "../app/api";
import { tagToString } from "../util/tag";
import { useTranslation } from "react-i18next";

type Props = {
  id: string;
  diashow: boolean;
  nextDocument: () => void;
};

export const DocumentPreview = ({ id, diashow, nextDocument }: Props) => {
  const [tagInput, setTagInput] = useState("");

  const { t } = useTranslation();

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

  const navigate = useNavigate();

  const [addTag] = enhancedApi.useAddTagToDocumentMutation();
  const [removeTag] = enhancedApi.useRemoveTagFromDocumentMutation();

  const addTagToDocument = useCallback(
    (tag: string) => {
      addTag({ documentId: id, tag });
    },
    [addTag, id],
  );

  const removeTagFromDocument = useCallback(
    (tag: ApiTag) => {
      removeTag({ documentId: id, tag: tagToString(tag) });
    },
    [removeTag, id],
  );

  if (!blob || !objectUrl) {
    return null;
  }

  return (
    <>
      {diashow && (
        <div className="fixed z-10 bg-gray-800 w-screen h-screen left-0 top-0">
          <plugin.Diashow
            objectUrl={objectUrl}
            defaultTimeout={3000}
            nextDocument={nextDocument}
          />
        </div>
      )}
      {!diashow && (
        <>
          <div
            className={twMerge(
              "absolute flex flex-col items-start gap-2 top-0 w-1/4 h-full z-0 bg-gray-800 p-2 border-b-2 border-gray-700 duration-200",
              tagListOpen ? "left-0" : "-left-1/4",
            )}
          >
            <div className="flex-col grow w-full overflow-y-auto">
              <TagList
                tags={data?.tags || []}
                onClick={(tag) =>
                  navigate(`?q=${tag.key}${tag.value ? `:${tag.value}` : ""}`)
                }
                onDelete={removeTagFromDocument}
              />
            </div>
            <div className="flex-col w-full">
              <TagInput
                value={tagInput}
                onChange={setTagInput}
                onSubmit={addTagToDocument}
                direction="up"
                className="text-white"
                clearOnSubmit
                placeholder={t("document.addTagPlaceholder")}
              />
            </div>
          </div>
          <div
            className={twMerge(
              "absolute top-1/2 z-80 bg-gray-700 p-2 border-r-2 border-r-transparent rounded-r-md duration-200 cursor-pointer",
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
            <plugin.Render objectUrl={objectUrl} />
          </div>
        </>
      )}
    </>
  );
};
