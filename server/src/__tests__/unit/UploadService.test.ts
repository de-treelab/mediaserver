import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UploadService } from "../../files/UploadService.js";
import { addFileTypePlugin, fileTypes } from "../../plugins/fileTypes.js";
import type { FileTypePlugin } from "../../plugins/plugin.js";
import type { FileService } from "../../files/FileService.js";
import type { DocumentService } from "../../documents/DocumentService.js";
import type { TagService } from "../../tags/TagService.js";
import type { WebSocketService } from "../../websocket/WebSocketService.js";

const makeFileService = (): FileService =>
  ({
    moveDocument: vi.fn().mockResolvedValue({
      id: "doc-1",
      basePath: "/base",
      filename: "file.png",
    }),
  }) as unknown as FileService;

const makeDocumentService = (): DocumentService =>
  ({
    createDocument: vi.fn().mockResolvedValue(undefined),
  }) as unknown as DocumentService;

const makeTagService = (): TagService =>
  ({
    addTagToDocument: vi.fn().mockResolvedValue(undefined),
  }) as unknown as TagService;

const makeWebSocketService = (): WebSocketService =>
  ({
    send: vi.fn().mockResolvedValue(undefined),
  }) as unknown as WebSocketService;

const makePlugin = (
  matches: boolean,
  initialTags: FileTypePlugin["initialTags"],
): FileTypePlugin => ({
  matcher: () => matches,
  thumbnailCreator: vi.fn(),
  initialTags,
  description: "test plugin",
});

const baseUpload = {
  name: "file.png",
  file: "/tmp/file.png",
  size: 1,
  mimeType: "image/png",
  extension: "png",
  webSocketClientId: "ws-1",
  tags: [],
  ownerId: "owner-1",
  isPublic: false,
  friendlyName: "File",
};

describe("UploadService.processUploadDocument initial tags", () => {
  let fileService: FileService;
  let documentService: DocumentService;
  let tagService: TagService;
  let webSocketServer: WebSocketService;
  let uploadService: UploadService;

  beforeEach(() => {
    fileService = makeFileService();
    documentService = makeDocumentService();
    tagService = makeTagService();
    webSocketServer = makeWebSocketService();
    uploadService = new UploadService(
      fileService,
      documentService,
      tagService,
      webSocketServer,
    );
  });

  afterEach(() => {
    // fileTypes is a module-level singleton; remove plugins added by the test.
    for (const key of Object.keys(fileTypes)) {
      delete fileTypes[key];
    }
    vi.restoreAllMocks();
  });

  it("aggregates initial tags from every matching plugin", async () => {
    addFileTypePlugin(
      "a",
      makePlugin(true, async () => [
        { key: "a", value: undefined, type: "default" },
      ]),
    );
    addFileTypePlugin(
      "b",
      makePlugin(true, async () => [{ key: "b", value: "1", type: "default" }]),
    );

    await uploadService.processUploadDocument({ ...baseUpload, tags: [] });

    const addedTags = vi
      .mocked(tagService.addTagToDocument)
      .mock.calls.map((call) => call[1]);
    expect(addedTags).toEqual(expect.arrayContaining(["a", "b:1"]));
    expect(webSocketServer.send).toHaveBeenCalledOnce();
  });

  it("does not call non-matching plugins", async () => {
    const matching = vi.fn(async () => [
      { key: "match", value: undefined, type: "default" },
    ]);
    const nonMatching = vi.fn(async () => [
      { key: "no", value: undefined, type: "default" },
    ]);
    addFileTypePlugin("match", makePlugin(true, matching));
    addFileTypePlugin("no-match", makePlugin(false, nonMatching));

    await uploadService.processUploadDocument({ ...baseUpload, tags: [] });

    expect(matching).toHaveBeenCalledOnce();
    expect(nonMatching).not.toHaveBeenCalled();
    const addedTags = vi
      .mocked(tagService.addTagToDocument)
      .mock.calls.map((call) => call[1]);
    expect(addedTags).toEqual(["match"]);
  });

  it("isolates a failing plugin so the upload still succeeds", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    addFileTypePlugin(
      "good",
      makePlugin(true, async () => [
        { key: "good", value: undefined, type: "default" },
      ]),
    );
    addFileTypePlugin(
      "bad",
      makePlugin(true, async () => {
        throw new Error("plugin boom");
      }),
    );

    await uploadService.processUploadDocument({ ...baseUpload, tags: [] });

    const addedTags = vi
      .mocked(tagService.addTagToDocument)
      .mock.calls.map((call) => call[1]);
    expect(addedTags).toEqual(["good"]);
    // upload-finished was sent, not upload-failed
    const sent = vi.mocked(webSocketServer.send).mock.calls[0]?.[0] as string;
    expect(sent).toContain("upload-finished");
  });
});
