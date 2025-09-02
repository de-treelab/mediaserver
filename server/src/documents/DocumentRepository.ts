import type { DbService } from "../sql/DbService.js";

export type CreateDocumentRequest = {
  id: string;
  basePath: string;
  filename: string;
};

export class DocumentRepository {
  constructor(private readonly dbService: DbService) {}

  public async createDocument(request: CreateDocumentRequest): Promise<void> {
    await this.dbService.none(
      "INSERT INTO documents (id, base_path, filename) VALUES ($id, $basePath, $filename)",
      request,
    );
  }
}
