import path from "path";
import type { PaginatedResponse } from "../util/PaginatedResponse.js";
import type {
  CreateDocumentRequest,
  Document,
  DocumentRepository,
  ListDocumentsRequest,
} from "./DocumentRepository.js";

type GetDocumentResponse = {
  path: string;
  mimeType: string;
};

export class DocumentService {
  constructor(private readonly documentRepository: DocumentRepository) {}

  public async createDocument(request: CreateDocumentRequest): Promise<void> {
    await this.documentRepository.createDocument(request);
  }

  public async listDocuments(
    request: ListDocumentsRequest,
  ): Promise<PaginatedResponse<Document>> {
    return this.documentRepository.listDocuments(request);
  }

  public async getDocumentThumbnail(id: string): Promise<string> {
    const document = await this.documentRepository.getDocumentWithPathInfo(id);
    return path.join(document.base_path, "thumbnails", `${id}.jpg`);
  }

  public async getDocument(id: string): Promise<GetDocumentResponse> {
    const document = await this.documentRepository.getDocumentWithPathInfo(id);
    return {
      path: path.join(document.base_path, "documents", document.filename),
      mimeType: document.mime,
    };
  }
}
