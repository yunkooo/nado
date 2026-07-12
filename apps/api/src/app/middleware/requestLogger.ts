import type { RequestHandler } from "express";
import { readRequestId } from "../../shared/http/requestContext.js";

export type ApiRequestLogEntry = {
  durationMs: number;
  method: string;
  path: string;
  requestId: string;
  statusCode: number;
};

export type ApiRequestLogger = (entry: ApiRequestLogEntry) => void;

export function createRequestLoggerMiddleware(
  logger: ApiRequestLogger | undefined,
): RequestHandler {
  return (request, response, next) => {
    const startedAt = performance.now();

    response.once("finish", () => {
      try {
        logger?.({
          durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
          method: request.method,
          path: request.originalUrl,
          requestId: readRequestId(response),
          statusCode: response.statusCode,
        });
      } catch {
        // Request logging must never affect the completed response.
      }
    });

    next();
  };
}
