import { MetaTag, Tag, TagIdCache } from "@lars_hagemann/tags";
import type {
  ApiTag,
  ListDocumentsRequest,
  TagRepository,
} from "./TagRepository.js";
import type { PaginatedResponse } from "../util/PaginatedResponse.js";
import type { Document } from "../documents/DocumentRepository.js";

export type ListTagsRequest = {
  limit: number;
  offset: number;
  query: string;
};

export class TagService {
  constructor(
    private tagRepository: TagRepository,
    private readonly tagIdCache: TagIdCache,
  ) {}

  private normalizeTag(tag: string): Tag | MetaTag {
    const parts = tag.split(":", 2);
    if (parts.length === 1) {
      return new Tag(parts[0]!.trim());
    } else {
      return new MetaTag(parts[0]!.trim(), parts[1]!.trim());
    }
  }

  public async listTags(request: ListTagsRequest) {
    return this.tagRepository.listTags({
      ...request,
      tag: this.normalizeTag(request.query),
    });
  }

  public async listDocuments(
    request: ListDocumentsRequest,
  ): Promise<PaginatedResponse<Document>> {
    return this.tagRepository.listDocuments(request);
  }

  public async getTagsForDocument(documentId: string): Promise<ApiTag[]> {
    return await this.tagRepository.getTagsForDocument(documentId);
  }

  public async addTagToDocument(documentId: string, tag: string) {
    const tagObject = this.normalizeTag(tag);
    await this.tagRepository.addTags([tagObject]);
    await this.tagRepository.addTagToDocument(documentId, tagObject);
  }

  public async removeTagFromDocument(documentId: string, tag: string) {
    const tagObject = this.normalizeTag(tag);
    await this.tagRepository.removeTagFromDocument(documentId, tagObject);
  }

  public async initIdCache(): Promise<void> {
    const tags = await this.tagRepository.enumerateTags();
    this.tagIdCache.init(
      tags.map((tag) => ({
        tagId: tag.id.toString(),
        tag: this.normalizeTag(`${tag.key}${tag.value ? `:${tag.value}` : ""}`),
      })),
    );
  }
}
