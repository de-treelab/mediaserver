import type {
  CreateDocumentRequest,
  DocumentRepository,
} from "./DocumentRepository.js";

export class DocumentService {
  constructor(private readonly documentRepository: DocumentRepository) {}

  public async createDocument(request: CreateDocumentRequest): Promise<void> {
    await this.documentRepository.createDocument(request);
  }
}
