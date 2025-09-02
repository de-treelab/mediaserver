export class ApiError extends Error {
  constructor(
    public readonly name: string,
    public readonly status: number,
    public readonly message: string,
  ) {
    super(message);
  }
}
