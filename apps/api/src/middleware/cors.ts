import type { RequestHandler } from "express";

export type CorsMiddlewareOptions = {
  allowLocalCors?: boolean;
};

export function createCorsMiddleware(
  options: CorsMiddlewareOptions = {},
): RequestHandler {
  const allowLocalCors = options.allowLocalCors ?? false;

  return (request, response, next) => {
    const origin = request.header("Origin");
    const allowOrigin = origin
      ? isAllowedCorsOrigin(origin, { allowLocalCors })
      : false;

    if (origin && allowOrigin) {
      response.set("Access-Control-Allow-Origin", origin);
      response.set("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
      response.set(
        "Access-Control-Allow-Headers",
        "Authorization, Content-Type",
      );
      response.set("Vary", "Origin");
    }

    if (request.method === "OPTIONS" && allowOrigin) {
      response.status(204).send();
      return;
    }

    next();
  };
}

function isAllowedCorsOrigin(
  origin: string,
  options: Required<CorsMiddlewareOptions>,
): boolean {
  if (readConfiguredCorsOrigins().includes(origin)) {
    return true;
  }

  if (isTauriDesktopOrigin(origin)) {
    return true;
  }

  if (!options.allowLocalCors) {
    return false;
  }

  try {
    const url = new URL(origin);

    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

function isTauriDesktopOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);

    if (url.protocol === "tauri:" && url.hostname === "localhost") {
      return true;
    }

    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.hostname === "tauri.localhost"
    );
  } catch {
    return false;
  }
}

function readConfiguredCorsOrigins(): string[] {
  return (process.env.NADO_CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}
