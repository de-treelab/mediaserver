import type { PaginatedResponse } from "../util/PaginatedResponse";
import { tagToString } from "../util/tag";
import { baseApi } from "./baseApi";

type DocumentUpload = {
  file: File;
  webSocketClientId: string;
  tags: ApiTag[];
};

export type Document = {
  id: string;
  mime: string;
  previousId: string | undefined;
  nextId: string | undefined;
  queryIndex: number;
};

interface StoreState {
  free: number;
  total: number;
  used: number;
  numberOfDocuments: number;
  basePath: string;
}

interface BackendState {
  stores: StoreState[];
  uptime: number;
}

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
      query: ({ file, webSocketClientId, tags }) => {
        const formData = new FormData();
        formData.append("upload", file);
        formData.append("tags", JSON.stringify(tags));
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
      { limit?: number; offset?: number; query?: string }
    >({
      query: ({ limit = 100, offset = 0, query = "" }) => ({
        url: `/documents?limit=${limit}&offset=${offset}&query=${encodeURIComponent(query)}`,
        method: "GET",
      }),
      providesTags: (response) => [
        "document",
        ...(response?.items.map(
          (doc) => ({ type: "document", id: doc.id }) as const,
        ) || []),
      ],
    }),

    getDocumentTags: build.query<{ tags: ApiTag[] }, string>({
      query: (documentId) => ({
        url: `/tags/${encodeURIComponent(documentId)}`,
        method: "GET",
      }),
      providesTags: (result, _result, documentId) => [
        "tag",
        { type: "document", id: documentId },
        ...(result?.tags.map(
          (t) => ({ type: "tag", id: tagToString(t) }) as const,
        ) || []),
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
        invalidatesTags: (_result, _error, arg) => [
          "tag",
          { type: "document", id: arg.documentId },
        ],
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
      invalidatesTags: (_result, _error, arg) => [
        "tag",
        { type: "document", id: arg.documentId },
      ],
    }),

    getBackendState: build.query<BackendState, void>({
      query: () => ({
        url: `/state`,
        method: "GET",
      }),
    }),
  }),
});
