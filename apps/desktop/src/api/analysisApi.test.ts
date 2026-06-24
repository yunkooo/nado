import { describe, expect, it, vi } from "vitest";
import { DEFAULT_ANALYSIS_MODEL_ID } from "@nado/shared";
import { analyzeText, resolveAnalyzeApiUrl } from "./analysisApi";

describe("resolveAnalyzeApiUrl", () => {
  it("joins the desktop API base URL with the analyze route", () => {
    expect(resolveAnalyzeApiUrl("http://127.0.0.1:8787")).toBe(
      "http://127.0.0.1:8787/api/analyze",
    );
    expect(resolveAnalyzeApiUrl("http://127.0.0.1:8787/")).toBe(
      "http://127.0.0.1:8787/api/analyze",
    );
  });

  it("falls back to the relative route when no base URL is configured", () => {
    expect(resolveAnalyzeApiUrl(undefined)).toBe("/api/analyze");
    expect(resolveAnalyzeApiUrl("   ")).toBe("/api/analyze");
  });
});

describe("analyzeText", () => {
  it("posts trimmed text to the configured desktop API and maps the response for the UI", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        status: "analyzable",
        result: {
          grammarPoints: [],
          sentences: [
            {
              chunks: [
                {
                  english: "I was wondering if",
                  literalTranslation: "제가 ~인지 궁금했습니다",
                  role: "정중하게 질문을 시작합니다.",
                },
              ],
              explanation: "도움을 정중하게 요청하는 문장입니다.",
              grammarPoints: [
                {
                  explanation: "부담을 줄여 요청을 부드럽게 만듭니다.",
                  grammarType: "정중 표현",
                  title: "I was wondering if",
                },
              ],
              source: "I was wondering if you could help me.",
              tokens: [
                { text: "I", vocabularyKey: "i" },
                { text: "was", vocabularyKey: "be" },
                { text: "wondering", vocabularyKey: "wonder" },
                { text: "if", vocabularyKey: "if" },
              ],
              translation: "도와주실 수 있는지 궁금합니다.",
            },
          ],
          structure: [
            {
              english: "I was wondering if",
              korean: "제가 ~인지 궁금했습니다",
              note: "직접적인 요청보다 부드러운 표현입니다.",
            },
          ],
          translation: "도와주실 수 있는지 궁금합니다.",
          translationExplanation: "정중한 요청 표현입니다.",
          vocabularyItems: [
            {
              baseForm: "wonder",
              contextMeaning: "무언가를 알고 싶어 하는 상태를 나타냅니다.",
              key: "wonder",
              meaning: "궁금해하다",
              partOfSpeech: "동사",
              saveLabel: "wondering",
              term: "wondering",
              type: "word",
            },
          ],
          vocabularySuggestions: [
            {
              key: "wonder",
              meaning: "궁금해하다",
              note: "정중한 질문에서 자주 쓰입니다.",
              term: "wondering",
              type: "word",
            },
          ],
        },
      }),
    );

    const result = await analyzeText(
      "  I was wondering if you could help me.  ",
      {
        apiBaseUrl: "http://127.0.0.1:8787",
        fetcher,
      },
    );

    expect(fetcher).toHaveBeenCalledWith("http://127.0.0.1:8787/api/analyze", {
      body: JSON.stringify({
        model: DEFAULT_ANALYSIS_MODEL_ID,
        text: "I was wondering if you could help me.",
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    expect(result).toMatchObject({
      data: {
        sourceText: "I was wondering if you could help me.",
        translation: ["도와주실 수 있는지 궁금합니다."],
        translationNotes: [
          {
            note: "정중한 요청 표현입니다.",
            term: "번역 포인트",
          },
          {
            note: "제가 ~인지 궁금했습니다 · 직접적인 요청보다 부드러운 표현입니다.",
            term: "I was wondering if",
          },
        ],
        vocabularyItems: [
          {
            baseForm: "wonder",
            contextMeaning: "무언가를 알고 싶어 하는 상태를 나타냅니다.",
            key: "wonder",
            meaning: "궁금해하다",
            partOfSpeech: "동사",
            term: "wondering",
            type: "word",
          },
        ],
        vocabularySuggestions: [
          {
            meaning: "궁금해하다",
            note: "정중한 질문에서 자주 쓰입니다.",
            term: "wondering",
            type: "word",
          },
        ],
      },
      status: "success",
    });
  });

  it("returns a not analyzable message without UI result data", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        reason: "영어 문장으로 분석하기 어려운 입력입니다.",
        status: "not_analyzable",
      }),
    );

    await expect(
      analyzeText("12345 !!!", {
        apiBaseUrl: "http://127.0.0.1:8787",
        fetcher,
      }),
    ).resolves.toEqual({
      message: "영어 문장으로 분석하기 어려운 입력입니다.",
      status: "not_analyzable",
    });
  });

  it("returns an error message from failed analyze responses", async () => {
    const fetcher = vi.fn(async () =>
      Response.json(
        {
          error: {
            code: "analysis_failed",
            message: "분석 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.",
            requestId: "request-1",
            retryable: true,
          },
        },
        { status: 502 },
      ),
    );

    await expect(
      analyzeText("I was wondering if you could help me.", {
        apiBaseUrl: "http://127.0.0.1:8787",
        fetcher,
      }),
    ).resolves.toEqual({
      code: "analysis_failed",
      message: "분석 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.",
      requestId: "request-1",
      retryable: true,
      status: "error",
      statusCode: 502,
    });
  });

  it("sends an authenticated bearer token when provided", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        reason: "영어 문장으로 분석하기 어려운 입력입니다.",
        status: "not_analyzable",
      }),
    );

    await analyzeText("I was wondering if you could help me.", {
      accessToken: "session-token",
      apiBaseUrl: "http://127.0.0.1:8787",
      fetcher,
      model: "z-ai/glm-5.2",
    });

    expect(fetcher).toHaveBeenCalledWith("http://127.0.0.1:8787/api/analyze", {
      body: JSON.stringify({
        model: "z-ai/glm-5.2",
        text: "I was wondering if you could help me.",
      }),
      headers: {
        Authorization: "Bearer session-token",
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  });

  it("returns an error when an analyzable response has malformed nested data", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        status: "analyzable",
        result: {
          grammarPoints: [],
          sentences: [
            {
              chunks: [
                {
                  english: "I was wondering if",
                  role: "정중하게 질문을 시작합니다.",
                },
              ],
              explanation: "도움을 정중하게 요청하는 문장입니다.",
              grammarPoints: [],
              source: "I was wondering if you could help me.",
              tokens: [],
              translation: "도와주실 수 있는지 궁금합니다.",
            },
          ],
          structure: [],
          translation: "도와주실 수 있는지 궁금합니다.",
          translationExplanation: "정중한 요청 표현입니다.",
          vocabularyItems: [],
          vocabularySuggestions: [],
        },
      }),
    );

    await expect(
      analyzeText("I was wondering if you could help me.", {
        apiBaseUrl: "http://127.0.0.1:8787",
        fetcher,
      }),
    ).resolves.toEqual({
      code: "invalid_analysis_response",
      message: "분석 결과 형식이 올바르지 않아요. 잠시 후 다시 시도해 주세요.",
      retryable: true,
      status: "error",
    });
  });

  it("returns a desktop server connection message when fetch fails", async () => {
    const fetcher = vi.fn(async () => {
      throw new Error("connection refused");
    });

    await expect(
      analyzeText("I was wondering if you could help me.", {
        apiBaseUrl: "http://127.0.0.1:8787",
        fetcher,
      }),
    ).resolves.toEqual({
      message: "분석 서버에 연결할 수 없어요. API 서버 설정을 확인해 주세요.",
      status: "error",
    });
  });
});
