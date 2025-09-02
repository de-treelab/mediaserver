import { ApiError } from "../../common/ApiError.js";

export class RowSchemaMismatchError extends ApiError {
  constructor() {
    super("RowSchemaMismatchError", 400, `Row does not match schema`);
  }
}
