import { describe, expect, it } from "vitest";
import { request } from "../../test-utils/httpTestServer.js";
import { analysisService } from "../../test-utils/appTestDoubles.js";
import { createApp } from "./createApp.js";

const app = createApp();

describe("createApp error boundary", () => {
  it("returns a JSON internal error for unexpected route failures", async () => {
    const app = createApp({
      analyzeService: analysisService,
      authService: {
        getUser: async () => ({ id: "user_1" }),
      },
      vocabularyServiceFactory: () => ({
        delete: async () => false,
        list: async () => {
          throw new Error("database unavailable");
        },
        save: async () => {
          throw new Error("not used");
        },
      }),
    });

    const response = await request(app, "/api/vocabulary", {
      headers: { Authorization: "Bearer valid-token" },
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "internal_error",
        message: "요청 처리 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.",
        requestId: expect.any(String),
        retryable: true,
      },
    });
  });

  it("returns JSON for unknown API routes", async () => {
    const response = await request(app, "/api/missing");
    const payload = (await response.json()) as {
      error: { requestId: string };
    };

    expect(response.status).toBe(404);
    expect(response.headers.get("X-Request-Id")).toBe(payload.error.requestId);
    expect(payload).toEqual({
      error: {
        code: "not_found",
        message: "요청한 API 경로를 찾을 수 없습니다.",
        requestId: expect.any(String),
        retryable: false,
      },
    });
  });
});
