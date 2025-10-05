import { ApiError } from "./ApiError.js";

export class MissingEnvironmentVariableError extends ApiError {
  constructor(variableName: string) {
    super(
      "MissingEnvironmentVariableError",
      500,
      `Missing required environment variable: ${variableName}`,
    );
  }
}
// abcd
export class InvalidEnvironmentVariableError extends ApiError {
  constructor(variableName: string, value: string, allowedValues?: string) {
    super(
      "InvalidEnvironmentVariableError",
      500,
      `Invalid environment variable: ${variableName}; value: ${value}${
        allowedValues ? `; allowed values are: ${allowedValues}` : ""
      }`,
    );
  }
}
