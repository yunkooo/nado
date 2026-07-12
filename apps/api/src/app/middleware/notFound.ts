import type { RequestHandler } from "express";
import { readRequestId } from "../../shared/http/requestContext.js";

export const notFoundHandler: RequestHandler = (_request, response) => {
  response.status(404).json({
    error: {
      code: "not_found",
      message: "요청한 API 경로를 찾을 수 없습니다.",
      requestId: readRequestId(response),
      retryable: false,
    },
  });
};
