import { describe, expect, it } from "vitest";
import { app, createApp, parseAnalyzeInput } from "./app.js";

describe("parseAnalyzeInput", () => {
  it("accepts a trimmed English input", () => {
    expect(parseAnalyzeInput({ text: "  I am learning English.  " })).toEqual({
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
});

describe("app", () => {
  const analysisService = {
    analyze: async () => ({
      reason: "not used in vocabulary route tests",
      status: "not_analyzable" as const,
    }),
  };

  it("returns health status", async () => {
    const response = await app.request("/health");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      service: "nado-api",
      status: "ok",
    });
  });

  it("rejects invalid analyze JSON", async () => {
    const response = await app.request("/api/analyze", {
      body: "{",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(400);
  });

  it("returns a structured analyze response for valid input", async () => {
    let receivedText = "";
    const app = createApp({
      analyzeService: {
        analyze: async (text) => {
          receivedText = text;

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
    });

    const response = await app.request("/api/analyze", {
      body: JSON.stringify({
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
    expect(receivedText).toBe("I was wondering if you could help me.");
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

    const response = await app.request("/api/analyze", {
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
    });

    const response = await app.request("/api/analyze", {
      body: JSON.stringify({ text: "I was wondering if you could help me." }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "analysis_failed",
        message: "분석 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.",
      },
    });
  });

  it("rejects vocabulary requests without a bearer token", async () => {
    const app = createApp({ analyzeService: analysisService });

    const response = await app.request("/api/vocabulary");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "not_authenticated",
        message: "Google 로그인이 필요합니다.",
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

    const response = await app.request("/api/vocabulary", {
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

    const response = await app.request("/api/vocabulary", {
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

    const response = await app.request("/api/vocabulary/row_1", {
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

    const response = await app.request("/api/vocabulary/missing", {
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
});
