import { MetaTag, Tag, TagParser } from "@lars_hagemann/tags";
import type {
  ApiTag,
  ApiTagWithCount,
  DocumentSelection,
  ListDocumentsRequest,
  TagRepository,
} from "./TagRepository.js";
import type { CursorPaginatedResponse } from "../util/PaginatedResponse.js";
import type {
  Document,
  DocumentWithTags,
} from "../documents/DocumentRepository.js";
import type { TagCache } from "./TagCache.js";
import type {
  CollectionAccessScope,
  DocumentAccessScope,
} from "../auth/AccessScope.js";
import type { CollectionRepository } from "../collections/CollectionRepository.js";
import { TagParseError } from "./TagParseError.js";

export type ListTagsRequest = {
  limit: number;
  offset: number;
  query: string;
};

export type SelectionTags = {
  // Number of selected documents
  total: number;
  tags: ApiTagWithCount[];
};

export class TagService {
  constructor(
    private tagRepository: TagRepository,
    private readonly tagCache: TagCache,
    private readonly collectionRepository?: CollectionRepository,
  ) {}

  public static normalizeTag(tag: string, type: string = "default"): ApiTag {
    const parts = tag.split(":", 2);
    if (parts.length === 1) {
      return { key: parts[0]!.trim(), value: undefined, type };
    } else {
      return { key: parts[0]!.trim(), value: parts[1]!.trim(), type };
    }
  }

  /**
   * Throws unless `tag` is a single tag (`key` or `key:value`), i.e. not an
   * expression like `a & b`. Use for tags coming from user input.
   */
  public static assertSingleTag(tag: string) {
    let filter;
    try {
      filter = new TagParser(tag).parse();
    } catch (err) {
      throw new TagParseError(err instanceof Error ? err.message : "Unknown");
    }
    if (!(filter instanceof Tag || filter instanceof MetaTag)) {
      throw new TagParseError(`Expected a single tag, got "${tag}"`);
    }
  }

  public static toString(tag: Tag | MetaTag) {
    // Note: this is also called with plain ApiTag objects (from normalizeTag),
    // which always carry a `value` key — `undefined` for value-less tags. Check
    // the value itself rather than `"value" in tag` so a value-less tag does not
    // serialize to `key:undefined` and miss the cache.
    const value = "value" in tag ? tag.value : undefined;
    return `${tag.key}${value ? `:${value}` : ""}`;
  }

  public async listTags(request: ListTagsRequest) {
    return this.tagRepository.listTags({
      ...request,
      tag: TagService.normalizeTag(request.query),
    });
  }

  /**
   * @param collectionScope collections that `collection:"<name>"` filters may
   * refer to. Without it, such filters only match plain tags.
   */
  public async listDocuments(
    request: ListDocumentsRequest,
    scope: DocumentAccessScope = { type: "all" },
    collectionScope?: CollectionAccessScope,
  ): Promise<CursorPaginatedResponse<Document>> {
    const resolveCollections = this.collectionResolver(collectionScope);
    return this.tagRepository.listDocuments({
      ...request,
      scope,
      ...(resolveCollections && { resolveCollections }),
    });
  }

  private collectionResolver(collectionScope?: CollectionAccessScope) {
    const collectionRepository = this.collectionRepository;
    if (!collectionRepository || !collectionScope) return undefined;
    return (name: string) =>
      collectionRepository.findCollectionsByName(name, collectionScope);
  }

  /** Tags of the selected documents, counting how many of them carry each. */
  public async listSelectionTags(
    selection: DocumentSelection,
    scope: DocumentAccessScope = { type: "all" },
    collectionScope?: CollectionAccessScope,
  ): Promise<SelectionTags> {
    const ids = await this.tagRepository.resolveSelection(
      selection,
      scope,
      this.collectionResolver(collectionScope),
    );
    return {
      total: ids.length,
      tags: await this.tagRepository.countTagsOfDocuments(ids),
    };
  }

  public async listDocumentsByIds(
    ids: string[],
    scope: DocumentAccessScope = { type: "all" },
  ): Promise<DocumentWithTags[]> {
    return this.tagRepository.listDocumentsByIds(ids, scope);
  }

  public async getTagsForDocument(documentId: string): Promise<ApiTag[]> {
    return await this.tagRepository.getTagsForDocument(documentId);
  }

  public async addTagToDocument(
    documentId: string,
    tag: string,
    type: string = "default",
  ) {
    const tagObject = TagService.normalizeTag(tag, type);
    await this.tagRepository.addTags([tagObject]);
    await this.tagRepository.addTagToDocument(documentId, tagObject);
  }

  public async removeTagFromDocument(documentId: string, tag: string) {
    const tagObject = TagService.normalizeTag(tag);
    await this.tagRepository.removeTagFromDocument(documentId, tagObject);
  }

  public async deleteTag(key: string, value: string): Promise<void> {
    await this.tagRepository.deleteTag(key, value);
  }

  public async initIdCache(): Promise<void> {
    const tags = await this.tagRepository.enumerateTags();
    this.tagCache.init(
      tags.map((tag) => ({
        tagId: tag.id.toString(),
        tag: TagService.normalizeTag(
          `${tag.key}${tag.value ? `:${tag.value}` : ""}`,
        ),
      })),
    );
  }

  public async bulkEditDocuments(
    selection: DocumentSelection,
    tagsToAdd: ApiTag[],
    tagsToRemove: ApiTag[],
    scope: DocumentAccessScope = { type: "all" },
    collectionScope?: CollectionAccessScope,
  ): Promise<void> {
    const ids = await this.tagRepository.resolveSelection(
      selection,
      scope,
      this.collectionResolver(collectionScope),
    );
    await this.tagRepository.bulkEditDocuments(
      ids,
      tagsToAdd,
      tagsToRemove,
      scope,
    );
  }
}
