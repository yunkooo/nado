import { randomUUID } from "node:crypto";
import type { RequestHandler, Response } from "express";

const REQUEST_ID_LOCAL_KEY = "requestId";

export function createRequestContextMiddleware(): RequestHandler {
  return (_request, response, next) => {
    const requestId = randomUUID();

    response.locals[REQUEST_ID_LOCAL_KEY] = requestId;
    response.set("X-Request-Id", requestId);
    next();
  };
}

export function readRequestId(response: Response): string {
  const requestId = response.locals[REQUEST_ID_LOCAL_KEY];

  return typeof requestId === "string" ? requestId : randomUUID();
}
