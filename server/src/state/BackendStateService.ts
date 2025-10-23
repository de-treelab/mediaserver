import type {
  BackendState,
  BackendStateRepository,
} from "./BackendStateRepository.js";

export class BackendStateService {
  constructor(
    private readonly backendStateRepository: BackendStateRepository,
  ) {}

  async getBackendState(): Promise<BackendState> {
    return this.backendStateRepository.getBackendState();
  }
}
