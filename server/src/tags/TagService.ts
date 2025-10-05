import { MetaTag, Tag } from "@lars_hagemann/tags";
import type { TagRepository } from "./TagRepository.js";

export type ListTagsRequest = {
  limit: number;
  offset: number;
  query: string;
};

export class TagService {
  constructor(private tagRepository: TagRepository) {}

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

  public async addTagToDocument(documentId: string, tag: string) {
    const tagObject = this.normalizeTag(tag);
    await this.tagRepository.addTags([tagObject]);
    await this.tagRepository.addTagToDocument(documentId, tagObject);
  }

  public async removeTagFromDocument(documentId: string, tag: string) {
    const tagObject = this.normalizeTag(tag);
    await this.tagRepository.removeTagFromDocument(documentId, tagObject);
  }
}
