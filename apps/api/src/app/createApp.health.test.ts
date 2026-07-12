import { describe, expect, it } from "vitest";
import { request } from "../../test-utils/httpTestServer.js";
import { createApp } from "./createApp.js";

const app = createApp();

describe("createApp health and readiness", () => {
  it("returns health status", async () => {
    const response = await request(app, "/health");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      service: "nado-api",
      status: "ok",
    });
  });

  it("returns readiness status after dependencies respond", async () => {
    const readinessChecks: string[] = [];
    const app = createApp({
      readinessService: {
        check: async () => {
          readinessChecks.push("checked");
        },
      },
    });

    const response = await request(app, "/ready");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      service: "nado-api",
      status: "ready",
    });
    expect(readinessChecks).toEqual(["checked"]);
  });

  it("returns service_not_ready and logs dependency failures", async () => {
    const loggedErrors: unknown[] = [];
    const app = createApp({
      errorLogger: (entry) => loggedErrors.push(entry),
      readinessService: {
        check: async () => {
          throw new Error("database unavailable");
        },
      },
    });

    const response = await request(app, "/ready");
    const payload = (await response.json()) as {
      error: { requestId: string };
    };

    expect(response.status).toBe(503);
    expect(response.headers.get("X-Request-Id")).toBe(payload.error.requestId);
    expect(payload).toEqual({
      error: {
        code: "service_not_ready",
        message: "API 의존 서비스를 확인할 수 없습니다.",
        requestId: expect.any(String),
        retryable: true,
      },
    });
    expect(loggedErrors).toEqual([
      expect.objectContaining({
        method: "GET",
        path: "/ready",
        requestId: payload.error.requestId,
        statusCode: 503,
      }),
    ]);
  });
});
