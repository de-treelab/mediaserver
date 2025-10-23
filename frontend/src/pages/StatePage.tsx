import { useTranslation } from "react-i18next";
import { enhancedApi } from "../app/enhancedApi";
import { bytesToHumanReadable } from "../util/bytesToHumanReadable";
import { ProgressBar } from "../components/ProgressBar";
import { twMerge } from "tailwind-merge";

export const StatePage = () => {
  const { data: backendState } = enhancedApi.useGetBackendStateQuery(void 0, {
    pollingInterval: 10000,
  });
  const { data: health } = enhancedApi.useHealthQuery(void 0, {
    pollingInterval: 10000,
  });

  const { t } = useTranslation();

  return (
    <div>
      {t("state.serviceState")}: {t("state." + (health?.status ?? "unhealthy"))}
      <div
        className={twMerge(
          "inline-block w-4 rounded-full ml-2 h-4 translate-y-0.5",
          health?.status === "healthy" ? "bg-green-500" : "bg-red-500",
        )}
      />
      {backendState?.stores.map((store, index) => (
        <div key={index} className="flex flex-row gap-4 mt-4 mb-4">
          <h3 className="text-xl">{store.basePath}</h3>
          <div className="grow pt-2">
            <ProgressBar max={store.total} value={store.used} />
          </div>
          <div className="flex flex-col -mt-2">
            <div>
              {bytesToHumanReadable(store.used)} /{" "}
              {bytesToHumanReadable(store.total)}
            </div>
            <div>
              {t("state.free")}: {bytesToHumanReadable(store.free)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
