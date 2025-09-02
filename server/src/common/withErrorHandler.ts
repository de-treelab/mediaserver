import { DatabaseError } from "pg";
import { ApiDatabaseError } from "../sql/errors/ApiDatabaseError.js";
import { DI_CONTAINER } from "../DiContainer.js";
import { LoggingService } from "./LoggingService.js";
import { services } from "../DefaultDiContainer.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const withErrorHandler = <
  T extends (...args: any[]) => any | Promise<any>,
>(
  _target: unknown,
  _key: string,
  property: TypedPropertyDescriptor<T>,
) => {
  property.set?.((async (...params: any[]) => {
    try {
      const result = property.value?.(...params);
      if (result instanceof Promise) {
        await result;
      }
      return result;
    } catch (err) {
      if (err instanceof DatabaseError) {
        DI_CONTAINER.get<LoggingService>(services.logger).error(
          "Database error",
          err,
        );
        throw new ApiDatabaseError(err.code);
      }

      throw err;
    }
  }) as T);

  return property;
};
/* eslint-enable @typescript-eslint/no-explicit-any */
