import type { ErrorRequestHandler } from "express";
import { isHttpError } from "../httpErrors.js";

export const invalidJsonHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  next,
) => {
  if (isJsonParseError(error)) {
    response.status(400).json({
      error: {
        code: "invalid_json",
        message: "Invalid JSON body.",
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
      },
    });
    return;
  }

  next(error);
};

export const internalErrorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  next,
) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (isHttpError(error)) {
    response.status(error.status).json({
      error: {
        code: error.code,
        message: error.publicMessage,
      },
    });
    return;
  }

  response.status(500).json({
    error: {
      code: "internal_error",
      message: "요청 처리 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.",
    },
  });
};

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
