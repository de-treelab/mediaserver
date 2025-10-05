import type { PaginatedResponse } from "../util/PaginatedResponse";
import { baseApi } from "./baseApi";

type DocumentUpload = {
  file: File;
  webSocketClientId: string;
};

type Document = {
  id: string;
  type: string;
  previousId: string | undefined;
  nextId: string | undefined;
  queryIndex: number;
};

export type ApiTag = {
  key: string;
  value?: string;
};

type ApiTagWithCount = ApiTag & {
  usageCount: number;
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
          url: `/documents/upload?webSocketClientId=${encodeURIComponent(
            webSocketClientId,
          )}&extension=${encodeURIComponent(
            (file.name.split(".").pop() || "").toLocaleLowerCase(),
          )}`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: ["tag", "document"],
    }),

    listDocuments: build.query<
      PaginatedResponse<Document>,
      { limit?: number; offset?: number }
    >({
      query: ({ limit = 100, offset = 0 }) => ({
        url: `/documents?limit=${limit}&offset=${offset}`,
        method: "GET",
      }),
    }),

    getDocumentTags: build.query<{ tags: ApiTag[] }, string>({
      query: (documentId) => ({
        url: `/tags/${encodeURIComponent(documentId)}`,
        method: "GET",
      }),
      providesTags: (_result, _error, documentId) => [
        { type: "tag", id: documentId },
      ],
    }),

    listTags: build.query<
      PaginatedResponse<ApiTagWithCount>,
      { limit?: number; offset?: number; query?: string }
    >({
      query: ({ limit = 100, offset = 0, query = "" }) => ({
        url: `/tags?limit=${limit}&offset=${offset}&query=${encodeURIComponent(
          query,
        )}`,
        method: "GET",
      }),
      providesTags: ["tag"],
    }),

    addTagToDocument: build.mutation<void, { documentId: string; tag: string }>(
      {
        query: ({ documentId, tag }) => ({
          url: `/tags/${encodeURIComponent(documentId)}/add`,
          method: "POST",
          body: { tag },
        }),
        invalidatesTags: ["tag"],
      },
    ),

    removeTagFromDocument: build.mutation<
      void,
      { documentId: string; tag: string }
    >({
      query: ({ documentId, tag }) => ({
        url: `/tags/${encodeURIComponent(documentId)}/remove`,
        method: "POST",
        body: { tag },
      }),
      invalidatesTags: ["tag"],
    }),
  }),
});
