import type { ErrorRequestHandler } from "express";
import { isHttpError } from "../../shared/errors/httpErrors.js";
import { readRequestId } from "../../shared/http/requestContext.js";

export type ApiErrorLogEntry = {
  error: unknown;
  method: string;
  path: string;
  requestId: string;
  statusCode: number;
};

export type ApiErrorLogger = (entry: ApiErrorLogEntry) => void;

export const invalidJsonHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  next,
) => {
  const requestId = readRequestId(response);

  if (isJsonParseError(error)) {
    response.status(400).json({
      error: {
        code: "invalid_json",
        message: "Invalid JSON body.",
        requestId,
        retryable: false,
      },
    });
    return;
  }

  if (isBodyParserHttpError(error)) {
    const status = readErrorStatus(error);

    response.status(status).json({
      error: {
        code: status === 413 ? "payload_too_large" : "invalid_request_body",
        message:
          status === 413
            ? "요청 본문이 너무 큽니다."
            : "요청 본문이 올바르지 않습니다.",
        requestId,
        retryable: false,
      },
    });
    return;
  }

  next(error);
};

export function createInternalErrorHandler(
  logger?: ApiErrorLogger,
): ErrorRequestHandler {
  return (error, request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }

    const requestId = readRequestId(response);
    const statusCode = isHttpError(error) ? error.status : 500;

    if (statusCode >= 500) {
      logApiError(logger, {
        error,
        method: request.method,
        path: request.originalUrl,
        requestId,
        statusCode,
      });
    }

    if (isHttpError(error)) {
      response.status(error.status).json({
        error: {
          code: error.code,
          message: error.publicMessage,
          requestId,
          retryable: error.retryable,
        },
      });
      return;
    }

    response.status(500).json({
      error: {
        code: "internal_error",
        message: "요청 처리 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.",
        requestId,
        retryable: true,
      },
    });
  };
}

function logApiError(
  logger: ApiErrorLogger | undefined,
  entry: ApiErrorLogEntry,
) {
  try {
    logger?.(entry);
  } catch {
    // Error logging must never replace the original API response.
  }
}

function isJsonParseError(error: unknown): boolean {
  return (
    error instanceof SyntaxError &&
    typeof error === "object" &&
    error !== null &&
    "body" in error
  );
}

function isBodyParserHttpError(
  error: unknown,
): error is Record<string, unknown> {
  if (!isRecord(error)) {
    return false;
  }

  const status = readErrorStatus(error);

  return status >= 400 && status < 500;
}

function readErrorStatus(error: Record<string, unknown>): number {
  const status = error.status ?? error.statusCode;

  return typeof status === "number" ? status : 400;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
