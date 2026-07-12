import { describe, expect, it } from "vitest";
import { request } from "../../test-utils/httpTestServer.js";
import { analysisUsageService } from "../../test-utils/appTestDoubles.js";
import { createApp } from "./createApp.js";

const app = createApp();

describe("createApp analysis route", () => {
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
        requestId: expect.any(String),
        retryable: false,
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
});
