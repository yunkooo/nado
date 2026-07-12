import { describe, expect, it } from "vitest";
import type { AnalyzeResponse } from "@nado/shared/analysis";
import { UpstreamTimeoutError } from "../shared/errors/httpErrors.js";
import { request } from "../../test-utils/httpTestServer.js";
import { analysisUsageService } from "../../test-utils/appTestDoubles.js";
import { createApp } from "./createApp.js";

const app = createApp();

describe("createApp analysis errors", () => {
  it("returns analysis_failed when the analyze service fails", async () => {
    const app = createApp({
      analyzeService: {
        analyze: async () => {
          throw new Error("OpenAI request failed");
        },
      },
      analysisUsageService,
    });

    const response = await request(app, "/api/analyze", {
      body: JSON.stringify({ text: "I was wondering if you could help me." }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "analysis_failed",
        message: "분석 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.",
        requestId: expect.any(String),
        retryable: true,
      },
    });
  });

  it("returns invalid_analysis_response when the analyze service returns malformed data", async () => {
    const app = createApp({
      analyzeService: {
        analyze: async () =>
          ({
            status: "analyzable",
            result: {
              translation: "도와주실 수 있는지 궁금합니다.",
            },
          }) as unknown as AnalyzeResponse,
      },
      analysisUsageService,
    });

    const response = await request(app, "/api/analyze", {
      body: JSON.stringify({ text: "I was wondering if you could help me." }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "invalid_analysis_response",
        message:
          "분석 결과 형식이 올바르지 않아요. 잠시 후 다시 시도해 주세요.",
        requestId: expect.any(String),
        retryable: true,
      },
    });
  });

  it("returns gateway_timeout when the analyze service times out", async () => {
    const app = createApp({
      analyzeService: {
        analyze: async () => {
          throw new UpstreamTimeoutError(
            "analysis_timeout",
            "분석 요청 시간이 오래 걸리고 있어요. 잠시 후 다시 시도해 주세요.",
          );
        },
      },
      analysisUsageService,
    });

    const response = await request(app, "/api/analyze", {
      body: JSON.stringify({ text: "I was wondering if you could help me." }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(504);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "analysis_timeout",
        message:
          "분석 요청 시간이 오래 걸리고 있어요. 잠시 후 다시 시도해 주세요.",
        requestId: expect.any(String),
        retryable: true,
      },
    });
  });

  it("returns payload_too_large for oversized JSON bodies", async () => {
    const response = await request(app, "/api/analyze", {
      body: JSON.stringify({ text: "I ".repeat(60_000) }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "payload_too_large",
        message: "요청 본문이 너무 큽니다.",
        requestId: expect.any(String),
        retryable: false,
      },
    });
  });

  it("returns rate_limited before calling the analyze service when usage is exhausted", async () => {
    let analyzeCalls = 0;
    const app = createApp({
      analyzeService: {
        analyze: async () => {
          analyzeCalls += 1;

          return {
            reason: "not used",
            status: "not_analyzable",
          };
        },
      },
      analysisUsageService: {
        consume: async () => ({
          limit: 1,
          ok: false,
          retryAfterSeconds: 60,
          used: 1,
        }),
      },
    });

    const response = await request(app, "/api/analyze", {
      body: JSON.stringify({ text: "I was wondering if you could help me." }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "rate_limited",
        message: "오늘 사용할 수 있는 분석 횟수를 모두 사용했어요.",
        requestId: expect.any(String),
        retryable: false,
      },
    });
    expect(analyzeCalls).toBe(0);
  });
});
