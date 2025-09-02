import { baseApi } from "./baseApi";

type DocumentUpload = {
  file: File;
  webSocketClientId: string;
};

export const api = baseApi.injectEndpoints({
  endpoints: (build) => ({
    health: build.query<{ status: string }, void>({
      query: () => ({
        url: "/health",
        method: "GET",
      }),
    }),

    documentUpload: build.mutation<void, DocumentUpload>({
      query: ({ file, webSocketClientId }) => {
        const formData = new FormData();
        formData.append("upload", file);
        return {
          url: `/document/upload?webSocketClientId=${encodeURIComponent(
            webSocketClientId,
          )}&extension=${encodeURIComponent(
            (file.name.split(".").pop() || "").toLocaleLowerCase(),
          )}`,
          method: "POST",
          body: formData,
        };
      },
    }),
  }),
});
