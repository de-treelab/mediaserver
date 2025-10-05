import { api } from "./api";

export const enhancedApi = api.enhanceEndpoints({
  endpoints: {
    documentUpload: {
      invalidatesTags: ["document"],
    },
    listDocuments: {
      providesTags: (response) => [
        "document",
        ...(response?.items.map(
          (doc) => ({ type: "document", id: doc.id }) as const,
        ) || []),
      ],
    },
  },
});
