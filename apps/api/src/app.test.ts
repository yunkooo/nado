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
});
