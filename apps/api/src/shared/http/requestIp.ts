import type { Request } from "express";

export function readRequestIp(request: Request): string {
  return request.ip ?? request.socket.remoteAddress ?? "unknown";
}
