import { describe, expect, it, vi } from "vitest";
import { analyzeText, resolveAnalyzeApiUrl } from "./analysisApi";

describe("resolveAnalyzeApiUrl", () => {
  it("uses the local nado API server by default for simulator runs", () => {
    expect(resolveAnalyzeApiUrl(undefined)).toBe(
      "http://localhost:4000/api/analyze",
    );
    expect(resolveAnalyzeApiUrl("   ")).toBe(
      "http://localhost:4000/api/analyze",
    );
  });

  it("joins a configured mobile API base URL with the analyze route", () => {
    expect(resolveAnalyzeApiUrl("http://127.0.0.1:8787")).toBe(
      "http://127.0.0.1:8787/api/analyze",
    );
    expect(resolveAnalyzeApiUrl("http://127.0.0.1:8787/")).toBe(
      "http://127.0.0.1:8787/api/analyze",
    );
  });
});

describe("analyzeText", () => {
  it("posts trimmed text to the mobile analyze API and maps summary data", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        status: "analyzable",
        result: {
          grammarPoints: [
            {
              explanation: "must는 강한 의무나 규칙을 나타냅니다.",
              grammarType: "문법 포인트",
              title: "must + verb",
            },
          ],
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
                  explanation:
                    "That's how + 절은 '~하는 방법이다'라는 패턴입니다.",
                  grammarType: "문법 포인트",
                  title: "That's how",
                },
              ],
              source: "I was wondering if you could help me.",
              tokens: [],
              translation: "도와주실 수 있는지 궁금합니다.",
            },
          ],
          structure: [
            {
              english: "I was wondering if",
              korean: "제가 ~인지 궁금했습니다",
              note: "정중한 요청을 여는 표현입니다.",
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
          vocabularySuggestions: [],
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
      body: JSON.stringify({ text: "I was wondering if you could help me." }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    expect(result).toEqual({
      data: {
        sentences: [
          {
            chunks: [
              {
                english: "I was wondering if",
                korean: "제가 ~인지 궁금했습니다",
              },
            ],
            grammarPoints: [
              {
                explanation:
                  "That's how + 절은 '~하는 방법이다'라는 패턴입니다.",
                target: "That's how",
                type: "문법 포인트",
              },
            ],
            indexLabel: "문장 1",
            naturalTranslation: "도와주실 수 있는지 궁금합니다.",
          },
        ],
        sentenceCountLabel: "문장 1개",
        sourceText: "I was wondering if you could help me.",
        translation: "도와주실 수 있는지 궁금합니다.",
        translationNotes: [
          {
            note: "정중한 요청 표현입니다.",
            term: "번역 포인트",
          },
          {
            note: "제가 ~인지 궁금했습니다 · 정중한 요청을 여는 표현입니다.",
            term: "I was wondering if",
          },
        ],
        vocabularyCountLabel: "저장 후보 1개",
        vocabularySuggestions: [
          {
            meaning: "궁금해하다",
            note: "무언가를 알고 싶어 하는 상태를 나타냅니다.",
            term: "wondering",
            type: "word",
          },
        ],
      },
      status: "success",
    });
  });

  it("returns a not analyzable message without summary data", async () => {
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
    });

    expect(fetcher).toHaveBeenCalledWith("http://127.0.0.1:8787/api/analyze", {
      body: JSON.stringify({ text: "I was wondering if you could help me." }),
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
      message: "분석 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.",
      status: "error",
    });
  });

  it("returns a mobile connection message when the API request cannot be sent", async () => {
    const fetcher = vi.fn(async () => {
      throw new TypeError("fetch failed");
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
