import { describe, expect, it } from "vitest";
import { request } from "../../test-utils/httpTestServer.js";
import { createApp } from "./createApp.js";

describe("createApp request logging", () => {
  it("logs completed requests with their correlation id", async () => {
    const requestLogs: unknown[] = [];
    const app = createApp({
      requestLogger: (entry) => requestLogs.push(entry),
    });

    const response = await request(app, "/health");
    const requestId = response.headers.get("X-Request-Id");

    expect(response.status).toBe(200);
    expect(requestLogs).toEqual([
      expect.objectContaining({
        durationMs: expect.any(Number),
        method: "GET",
        path: "/health",
        requestId,
        statusCode: 200,
      }),
    ]);
  });
});
