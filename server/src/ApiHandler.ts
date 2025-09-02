import type { RequestHandler } from "express";
import type { ContainerBuilder } from "node-dependency-injection";
import { DI_CONTAINER } from "./DiContainer.js";
import { ApiError } from "./common/ApiError.js";
import type fileUpload from "express-fileupload";
import type { EmptyObject } from "./common/EmptyObject.js";
import { LoggingService } from "./common/LoggingService.js";
import { services } from "./DefaultDiContainer.js";

type ApiResult<Response extends object> = {
  status: number;
  body: Response;
};

type ApiFunction<
  Params extends object,
  Response extends object,
  Body extends object,
  Query extends object,
> = (params: {
  diContainer: ContainerBuilder;
  query: Query;
  body: Body;
  params: Params;
  files: fileUpload.FileArray | null | undefined;
}) => Promise<ApiResult<Response>>;

export const apiHandler = <
  Response extends object = EmptyObject,
  Query extends object = EmptyObject,
  Body extends object = EmptyObject,
  Params extends object = EmptyObject,
>(
  fn: ApiFunction<Params, Response, Body, Query>,
): RequestHandler<
  Params,
  Response | ApiError,
  Body,
  Query,
  Record<string, unknown>
> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return async (req, res, _next) => {
    DI_CONTAINER.get<LoggingService>(services.logger).debug(
      `${req.method} ${decodeURIComponent(req.url)}`,
    );

    try {
      const result = await fn({
        diContainer: DI_CONTAINER,
        query: req.query,
        body: req.body,
        params: req.params,
        files: req.files,
      });
      res.status(result.status).json(result.body);
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.status).json(error);
      } else {
        DI_CONTAINER.get<LoggingService>(services.logger).error(
          "Error occurred while processing API request",
          error,
        );
        res.status(500).json({
          status: 500,
          message: "Internal Server Error",
          name: "InternalServerError",
        });
      }
    }
  };
};
