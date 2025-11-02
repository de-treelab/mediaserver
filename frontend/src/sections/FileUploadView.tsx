import { useMemo, useState } from "react";
import { Tabs, type TabSpec } from "../components/Tabs";
import { BiErrorAlt } from "react-icons/bi";
import { Icon } from "../components/Icon";
import { BsFilterLeft } from "react-icons/bs";
import { FaGears } from "react-icons/fa6";
import { MdDoneAll } from "react-icons/md";
import { AiOutlineUpload } from "react-icons/ai";
import { useUploadContext, type FileProxy } from "../upload/UploadContext";
import { WithNumberIndicator } from "../components/WithNumberIndicator";
import { fileIconFromFile } from "../util/fileIconFromFile";
import { useTranslation } from "react-i18next";
import { twMerge } from "tailwind-merge";

type AllowedTabs = "All" | "Uploading" | "Success" | "Failed";

const fileProxyStatusToIcon = (file: FileProxy) => {
  switch (file.status) {
    case "failed":
      return (
        <Icon
          Icon={BiErrorAlt}
          size="xxlarge"
          className="text-red-500 mr-4 basis-12"
          title={file.errorReason}
        />
      );
    case "success":
      return (
        <Icon
          Icon={MdDoneAll}
          size="xxlarge"
          className="text-green-600 mr-4 basis-12"
        />
      );
    case "prepared":
      return (
        <Icon
          Icon={AiOutlineUpload}
          size="xxlarge"
          className="text-blue-500 mr-4 basis-12"
        />
      );
    case "uploading":
      return (
        <Icon
          Icon={FaGears}
          size="xxlarge"
          className="text-yellow-500 mr-4 basis-12"
        />
      );
  }
};

const FileList = ({ files }: { files: FileProxy[] }) => {
  return (
    <div className="bg-white p-2 basis-full">
      {files.map((file, idx) => (
        <div
          title={file.errorReason}
          className="flex flex-row text-center p-1 items-center"
          key={idx}
        >
          <Icon
            Icon={fileIconFromFile(file)}
            size="xxlarge"
            className="text-gray-500 mr-4 basis-12"
          />
          <span
            title={file.name}
            className="text-lg grow basis-full text-left grow-0 overflow-x-hidden text-ellipsis"
          >
            {file.name}
          </span>
          {fileProxyStatusToIcon(file)}
        </div>
      ))}
    </div>
  );
};

type Props = {
  className?: string;
  hideWhenNoFiles?: boolean;
};

export const FileUploadView: React.FC<Props> = ({
  className,
  hideWhenNoFiles = true,
}) => {
  const [currentTab, setCurrentTab] = useState<AllowedTabs | undefined>("All");

  const { toBeProcessed, processedFiles, failedFiles } = useUploadContext();

  const allFiles: FileProxy[] = useMemo(
    () => [...toBeProcessed, ...processedFiles, ...failedFiles],
    [toBeProcessed, processedFiles, failedFiles],
  );

  const { t } = useTranslation();

  const tabSpec: TabSpec<AllowedTabs>[] = useMemo(
    () => [
      {
        tabId: "All",
        node: (
          <WithNumberIndicator count={allFiles.length} color="bg-blue-500">
            <Icon
              Icon={BsFilterLeft}
              size="xlarge"
              className="text-blue-500"
              title={t("fileUpload.allFiles")}
            />
          </WithNumberIndicator>
        ),
      },
      {
        tabId: "Uploading",
        node: (
          <WithNumberIndicator count={toBeProcessed.size} color="bg-blue-500">
            <Icon
              Icon={AiOutlineUpload}
              size="xlarge"
              className="text-blue-500"
              title={t("fileUpload.uploadingFiles")}
            />
          </WithNumberIndicator>
        ),
      },
      {
        tabId: "Success",
        node: (
          <WithNumberIndicator count={processedFiles.size} color="bg-green-600">
            <Icon
              Icon={MdDoneAll}
              size="xlarge"
              className="text-green-600"
              title={t("fileUpload.successfulFiles")}
            />
          </WithNumberIndicator>
        ),
      },
      {
        tabId: "Failed",
        node: (
          <WithNumberIndicator count={failedFiles.size} color="bg-red-500">
            <Icon
              Icon={BiErrorAlt}
              size="xlarge"
              className="text-red-500"
              title={t("fileUpload.failedFiles")}
            />
          </WithNumberIndicator>
        ),
      },
    ],
    [allFiles, failedFiles, processedFiles, toBeProcessed, t],
  );

  if (allFiles.length === 0 && hideWhenNoFiles) {
    return null;
  }

  return (
    <div className={twMerge("text-black rounded-t-md", className)}>
      <div className="max-h-[30vh] overflow-y-auto">
        {currentTab === "All" && <FileList files={allFiles} />}
        {currentTab === "Uploading" && (
          <FileList files={Array.from(toBeProcessed)} />
        )}
        {currentTab === "Success" && (
          <FileList files={Array.from(processedFiles)} />
        )}
        {currentTab === "Failed" && (
          <FileList files={Array.from(failedFiles)} />
        )}
      </div>
      <Tabs
        className={currentTab && "border-t-1"}
        tabs={tabSpec}
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        allowNoSelection={true}
      />
    </div>
  );
};
