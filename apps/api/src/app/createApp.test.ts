import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { describe, expect, it } from "vitest";
import { parseAnalyzeInput } from "../features/analysis/analyzeInput.js";
import { UpstreamTimeoutError } from "../shared/errors/httpErrors.js";
import { app, createApp } from "./createApp.js";

type TestHttpApp = {
  listen(port: number, hostname: string, callback: () => void): Server;
};

async function request(
  app: TestHttpApp,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const server = await listen(app);

  try {
    const address = server.address();

    if (!isAddressInfo(address)) {
      throw new Error("Test server did not expose a TCP address.");
    }

    return await fetch(`http://127.0.0.1:${address.port}${path}`, init);
  } finally {
    await close(server);
  }
}

function listen(app: TestHttpApp): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));

    server.once("error", reject);
  });
}

function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function isAddressInfo(
  value: string | AddressInfo | null,
): value is AddressInfo {
  return typeof value === "object" && value !== null;
}

describe("parseAnalyzeInput", () => {
  it("accepts a trimmed English input", () => {
    expect(parseAnalyzeInput({ text: "  I am learning English.  " })).toEqual({
      model: "moonshotai/kimi-k2.7-code",
      ok: true,
      text: "I am learning English.",
    });
  });

  it("rejects blank input", () => {
    expect(parseAnalyzeInput({ text: " " })).toEqual({
      code: "invalid_input",
      issues: ["analysis.text.required"],
      ok: false,
    });
  });

  it("rejects unsupported hidden characters", () => {
    expect(parseAnalyzeInput({ text: "I\u200B leave home." })).toEqual({
      code: "invalid_input",
      issues: ["analysis.text.unsupported_characters"],
      ok: false,
    });
  });
});

describe("app", () => {
  const analysisService = {
    analyze: async () => ({
      reason: "not used in vocabulary route tests",
      status: "not_analyzable" as const,
    }),
  };
  const analysisUsageService = {
    consume: async () => ({
      limit: null,
      ok: true as const,
      remaining: null,
      used: 1,
    }),
  };

  it("returns health status", async () => {
    const response = await request(app, "/health");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      service: "nado-api",
      status: "ok",
    });
  });

  it("allows Expo mobile web clients to call API routes", async () => {
    const response = await request(app, "/api/analyze", {
      headers: {
        "Access-Control-Request-Headers": "content-type",
        "Access-Control-Request-Method": "POST",
        Origin: "http://localhost:8081",
      },
      method: "OPTIONS",
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:8081",
    );
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
      "Content-Type",
    );
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
      "POST",
    );
  });

  it("allows Tauri desktop clients to call API routes", async () => {
    for (const origin of [
      "tauri://localhost",
      "http://tauri.localhost",
      "https://tauri.localhost",
    ]) {
      const response = await request(app, "/api/vocabulary", {
        headers: {
          "Access-Control-Request-Headers": "authorization",
          "Access-Control-Request-Method": "GET",
          Origin: origin,
        },
        method: "OPTIONS",
      });

      expect(response.status).toBe(204);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin);
      expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
        "Authorization",
      );
      expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
        "GET",
      );
    }
  });

  it("does not allow localhost CORS when local origins are disabled", async () => {
    const app = createApp({
      allowLocalCors: false,
      analyzeService: analysisService,
    });
    const response = await request(app, "/api/analyze", {
      headers: {
        "Access-Control-Request-Headers": "content-type",
        "Access-Control-Request-Method": "POST",
        Origin: "http://localhost:3000",
      },
      method: "OPTIONS",
    });

    expect(response.status).not.toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("rejects invalid analyze JSON", async () => {
    const response = await request(app, "/api/analyze", {
      body: "{",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "invalid_json",
        message: "Invalid JSON body.",
      },
    });
  });

  it("returns a structured analyze response for valid input", async () => {
    let receivedInput: { model?: string; text: string } | undefined;
    const analysisTimingLogs: unknown[] = [];
    const app = createApp({
      analyzeService: {
        analyze: async (input) => {
          receivedInput = input;

          return {
            status: "analyzable",
            result: {
              translation: "도와주실 수 있는지 궁금합니다.",
              translationExplanation: "정중한 요청 표현입니다.",
              sentences: [
                {
                  source: "I was wondering if you could help me.",
                  translation: "도와주실 수 있는지 궁금합니다.",
                  explanation: "도움을 정중하게 요청하는 문장입니다.",
                  tokens: [
                    { text: "I", vocabularyKey: "i" },
                    { text: ".", vocabularyKey: null },
                  ],
                  chunks: [
                    {
                      english: "I was wondering if",
                      literalTranslation: "제가 ~인지 궁금했습니다",
                      role: "정중하게 질문을 시작합니다.",
                    },
                  ],
                  grammarPoints: [],
                },
              ],
              structure: [],
              grammarPoints: [],
              vocabularyItems: [
                {
                  key: "wonder",
                  term: "wondering",
                  baseForm: "wonder",
                  type: "word",
                  partOfSpeech: "verb",
                  meaning: "궁금해하다",
                  contextMeaning: "정중하게 요청을 꺼내는 표현입니다.",
                  saveLabel: "wonder",
                },
              ],
              vocabularySuggestions: [],
            },
          };
        },
      },
      analysisUsageService,
      analysisTimingLogger: (entry) => {
        analysisTimingLogs.push(entry);
      },
    });

    const response = await request(app, "/api/analyze", {
      body: JSON.stringify({
        model: "z-ai/glm-5.2",
        text: "  I was wondering if you could help me.  ",
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "analyzable",
      result: {
        translation: "도와주실 수 있는지 궁금합니다.",
      },
    });
    expect(receivedInput).toEqual({
      model: "z-ai/glm-5.2",
      text: "I was wondering if you could help me.",
    });
    expect(analysisTimingLogs).toHaveLength(1);
    expect(analysisTimingLogs[0]).toMatchObject({
      model: "z-ai/glm-5.2",
      outcome: "success",
      route: "POST /api/analyze",
      status: "analyzable",
      statusCode: 200,
      textLength: 37,
      timingsMs: {
        analyze: expect.any(Number),
        responseValidation: expect.any(Number),
        total: expect.any(Number),
        usageConsume: expect.any(Number),
        usageIdentity: expect.any(Number),
      },
      usageIdentity: "anonymous",
    });
    expect(analysisTimingLogs[0]).not.toHaveProperty("text");
  });

  it("does not call the analyze service for locally rejected input", async () => {
    let calls = 0;
    const app = createApp({
      analyzeService: {
        analyze: async () => {
          calls += 1;

          return {
            reason: "should not be used",
            status: "not_analyzable",
          };
        },
      },
    });

    const response = await request(app, "/api/analyze", {
      body: JSON.stringify({ text: "1234567890 !!!" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      reason: "영어 문장으로 분석하기 어려운 입력입니다.",
      status: "not_analyzable",
    });
    expect(calls).toBe(0);
  });

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
        analyze: async () => ({
          status: "analyzable" as const,
          result: {
            translation: "도와주실 수 있는지 궁금합니다.",
          },
        }),
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

  it("uses an authenticated user id for analyze usage when a bearer token is valid", async () => {
    const identities: unknown[] = [];
    const app = createApp({
      analyzeService: analysisService,
      analysisUsageService: {
        consume: async (identity) => {
          identities.push(identity);

          return {
            limit: 5,
            ok: true,
            remaining: 4,
            used: 1,
          };
        },
      },
      authService: {
        getUser: async () => ({ id: "user_1" }),
      },
    });

    const response = await request(app, "/api/analyze", {
      body: JSON.stringify({ text: "I was wondering if you could help me." }),
      headers: {
        Authorization: "Bearer valid-token",
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    expect(response.status).toBe(200);
    expect(identities).toEqual([{ ipHash: null, userId: "user_1" }]);
  });

  it("uses a hashed client IP for anonymous analyze usage", async () => {
    const identities: Array<{ ipHash: string | null; userId: string | null }> =
      [];
    const app = createApp({
      analyzeService: analysisService,
      analysisUsageService: {
        consume: async (identity) => {
          identities.push(identity);

          return {
            limit: null,
            ok: true,
            remaining: null,
            used: 1,
          };
        },
      },
    });

    const response = await request(app, "/api/analyze", {
      body: JSON.stringify({ text: "I was wondering if you could help me." }),
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": "203.0.113.10, 10.0.0.1",
      },
      method: "POST",
    });

    expect(response.status).toBe(200);
    expect(identities).toHaveLength(1);
    expect(identities[0]?.userId).toBeNull();
    expect(identities[0]?.ipHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("does not trust spoofed forwarded IP headers by default", async () => {
    const identities: Array<{ ipHash: string | null; userId: string | null }> =
      [];
    const app = createApp({
      analyzeService: analysisService,
      analysisUsageService: {
        consume: async (identity) => {
          identities.push(identity);

          return {
            limit: null,
            ok: true,
            remaining: null,
            used: identities.length,
          };
        },
      },
      usageIpHashSalt: "test-salt",
    });

    for (const forwardedFor of ["203.0.113.10", "198.51.100.20"]) {
      const response = await request(app, "/api/analyze", {
        body: JSON.stringify({ text: "I was wondering if you could help me." }),
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": forwardedFor,
        },
        method: "POST",
      });

      expect(response.status).toBe(200);
    }

    expect(identities).toHaveLength(2);
    expect(identities[0]?.ipHash).toBe(identities[1]?.ipHash);
  });

  it("rejects vocabulary requests without a bearer token", async () => {
    const app = createApp({ analyzeService: analysisService });

    const response = await request(app, "/api/vocabulary");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "not_authenticated",
        message: "Google 로그인이 필요합니다.",
      },
    });
  });

  it("returns auth_unavailable when the auth service fails", async () => {
    const app = createApp({
      analyzeService: analysisService,
      authService: {
        getUser: async () => {
          throw new Error("Supabase Auth unavailable");
        },
      },
    });

    const response = await request(app, "/api/vocabulary", {
      headers: { Authorization: "Bearer valid-token" },
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "auth_unavailable",
        message: "로그인 세션을 확인할 수 없어요. 잠시 후 다시 시도해 주세요.",
      },
    });
  });

  it("returns the authenticated user's vocabulary items", async () => {
    const seenTokens: string[] = [];
    const app = createApp({
      analyzeService: analysisService,
      authService: {
        getUser: async (token) => {
          seenTokens.push(token);

          return { id: "user_1" };
        },
      },
      vocabularyServiceFactory: (token) => {
        seenTokens.push(`factory:${token}`);

        return {
          delete: async () => false,
          list: async (userId) => [
            {
              createdAt: "2026-06-09T00:00:00.000Z",
              id: "row_1",
              meanings: [
                {
                  createdAt: "2026-06-09T00:00:00.000Z",
                  meaning: "~인지 궁금하다",
                },
              ],
              term: "wonder if",
              type: "phrase",
              updatedAt: "2026-06-09T00:00:00.000Z",
            },
          ],
          save: async () => {
            throw new Error("not used");
          },
        };
      },
    });

    const response = await request(app, "/api/vocabulary", {
      headers: { Authorization: "Bearer valid-token" },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      items: [
        {
          createdAt: "2026-06-09T00:00:00.000Z",
          id: "row_1",
          meanings: [
            {
              createdAt: "2026-06-09T00:00:00.000Z",
              meaning: "~인지 궁금하다",
            },
          ],
          term: "wonder if",
          type: "phrase",
          updatedAt: "2026-06-09T00:00:00.000Z",
        },
      ],
    });
    expect(seenTokens).toEqual(["valid-token", "factory:valid-token"]);
  });

  it("returns an empty vocabulary list for an authenticated user without saved items", async () => {
    const app = createApp({
      analyzeService: analysisService,
      authService: {
        getUser: async () => ({ id: "user_1" }),
      },
      vocabularyServiceFactory: () => ({
        delete: async () => false,
        list: async () => [],
        save: async () => {
          throw new Error("not used");
        },
      }),
    });

    const response = await request(app, "/api/vocabulary", {
      headers: { Authorization: "Bearer valid-token" },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ items: [] });
  });

  it("saves vocabulary for the authenticated user", async () => {
    const app = createApp({
      analyzeService: analysisService,
      authService: {
        getUser: async () => ({ id: "user_1" }),
      },
      vocabularyServiceFactory: () => ({
        delete: async () => false,
        list: async () => [],
        save: async (userId, request) => ({
          createdAt: "2026-06-09T00:00:00.000Z",
          id: `${userId}:${request.type}`,
          meanings: [
            {
              createdAt: "2026-06-09T00:00:00.000Z",
              meaning: request.meaning,
              note: request.note,
            },
          ],
          term: request.term,
          type: request.type,
          updatedAt: "2026-06-09T00:00:00.000Z",
        }),
      }),
    });

    const response = await request(app, "/api/vocabulary", {
      body: JSON.stringify({
        meaning: "~인지 궁금하다",
        note: "정중한 질문에서 자주 쓰입니다.",
        term: "wonder if",
        type: "phrase",
      }),
      headers: {
        Authorization: "Bearer valid-token",
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      item: {
        id: "user_1:phrase",
        term: "wonder if",
        type: "phrase",
      },
    });
  });

  it("deletes vocabulary for the authenticated user", async () => {
    const app = createApp({
      analyzeService: analysisService,
      authService: {
        getUser: async () => ({ id: "user_1" }),
      },
      vocabularyServiceFactory: () => ({
        delete: async (userId, id) => userId === "user_1" && id === "row_1",
        list: async () => [],
        save: async () => {
          throw new Error("not used");
        },
      }),
    });

    const response = await request(app, "/api/vocabulary/row_1", {
      headers: { Authorization: "Bearer valid-token" },
      method: "DELETE",
    });

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });

  it("returns not_found when deleting a missing vocabulary item", async () => {
    const app = createApp({
      analyzeService: analysisService,
      authService: {
        getUser: async () => ({ id: "user_1" }),
      },
      vocabularyServiceFactory: () => ({
        delete: async () => false,
        list: async () => [],
        save: async () => {
          throw new Error("not used");
        },
      }),
    });

    const response = await request(app, "/api/vocabulary/missing", {
      headers: { Authorization: "Bearer valid-token" },
      method: "DELETE",
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "not_found",
        message: "단어장 항목을 찾을 수 없습니다.",
      },
    });
  });

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
      },
    });
  });
});
