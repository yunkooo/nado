import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_ANALYSIS_MODEL_ID } from "@nado/shared";
import { analyzeText } from "./analysisApi";

describe("analyzeText", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("posts trimmed text to the analyze API and maps the response for the UI", async () => {
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
        fetcher,
      },
    );

    expect(fetcher).toHaveBeenCalledWith("/api/analyze", {
      body: JSON.stringify({
        model: DEFAULT_ANALYSIS_MODEL_ID,
        text: "I was wondering if you could help me.",
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
      signal: expect.any(AbortSignal),
    });
    expect(result).toMatchObject({
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
                explanation: "부담을 줄여 요청을 부드럽게 만듭니다.",
                target: "I was wondering if",
                type: "정중 표현",
              },
            ],
            indexLabel: "문장 1",
            naturalTranslation: "도와주실 수 있는지 궁금합니다.",
            tokens: [
              { text: "I", vocabularyKey: "i" },
              { text: "was", vocabularyKey: "be" },
              { text: "wondering", vocabularyKey: "wonder" },
              { text: "if", vocabularyKey: "if" },
            ],
          },
        ],
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
        vocabularySuggestions: [
          {
            meaning: "궁금해하다",
            note: "정중한 질문에서 자주 쓰입니다.",
            term: "wondering",
            type: "word",
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
      },
      status: "success",
    });
  });

  it("uses vocabulary items as save suggestions when no priority suggestions are returned", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        status: "analyzable",
        result: {
          grammarPoints: [],
          sentences: [
            {
              chunks: [
                {
                  english: "take a look",
                  literalTranslation: "살펴보다",
                  role: "확인을 요청합니다.",
                },
              ],
              explanation: "확인을 부탁하는 문장입니다.",
              grammarPoints: [],
              source: "Could you take a look?",
              tokens: [],
              translation: "한번 봐주실 수 있나요?",
            },
          ],
          structure: [],
          translation: "한번 봐주실 수 있나요?",
          translationExplanation: "부드러운 요청 표현입니다.",
          vocabularyItems: [
            {
              baseForm: "take a look",
              contextMeaning: "가볍게 확인해 달라고 요청할 때 씁니다.",
              key: "take-a-look",
              meaning: "살펴보다",
              partOfSpeech: null,
              saveLabel: "take a look",
              term: "take a look",
              type: "phrase",
            },
          ],
          vocabularySuggestions: [],
        },
      }),
    );

    const result = await analyzeText("Could you take a look?", { fetcher });

    expect(result).toMatchObject({
      data: {
        vocabularySuggestions: [
          {
            meaning: "살펴보다",
            note: "가볍게 확인해 달라고 요청할 때 씁니다.",
            term: "take a look",
            type: "phrase",
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

    await expect(analyzeText("12345 !!!", { fetcher })).resolves.toEqual({
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
          },
        },
        { status: 502 },
      ),
    );

    await expect(
      analyzeText("I was wondering if you could help me.", { fetcher }),
    ).resolves.toEqual({
      message: "분석 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.",
      status: "error",
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
      analyzeText("I was wondering if you could help me.", { fetcher }),
    ).resolves.toEqual({
      message: "분석 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.",
      status: "error",
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
      fetcher,
      model: "z-ai/glm-5.2",
    });

    expect(fetcher).toHaveBeenCalledWith("/api/analyze", {
      body: JSON.stringify({
        model: "z-ai/glm-5.2",
        text: "I was wondering if you could help me.",
      }),
      headers: {
        Authorization: "Bearer session-token",
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: expect.any(AbortSignal),
    });
  });

  it("returns a timeout message when the analyze request is aborted", async () => {
    const fetcher = vi.fn(async () => {
      throw new DOMException("Aborted", "AbortError");
    });

    await expect(
      analyzeText("I was wondering if you could help me.", { fetcher }),
    ).resolves.toEqual({
      message:
        "분석 요청 시간이 오래 걸리고 있어요. 잠시 후 다시 시도해 주세요.",
      status: "error",
    });
  });

  it("waits long enough for deployed analysis responses", async () => {
    vi.useFakeTimers();
    let aborted = false;
    let resolveResponse: ((response: Response) => void) | undefined;
    const fetcher = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        const signal = init?.signal;

        if (signal instanceof AbortSignal) {
          signal.addEventListener("abort", () => {
            aborted = true;
          });
        }

        return new Promise<Response>((resolve) => {
          resolveResponse = resolve;
        });
      },
    );

    const resultPromise = analyzeText("I was wondering if you could help me.", {
      fetcher,
    });

    await vi.advanceTimersByTimeAsync(25_000);

    expect(aborted).toBe(false);
    resolveResponse?.(
      Response.json({
        reason: "영어 문장으로 분석하기 어려운 입력입니다.",
        status: "not_analyzable",
      }),
    );

    await expect(resultPromise).resolves.toEqual({
      message: "영어 문장으로 분석하기 어려운 입력입니다.",
      status: "not_analyzable",
    });
  });

  it("returns an error message when the analyze request cannot be sent", async () => {
    const fetcher = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });

    await expect(
      analyzeText("I was wondering if you could help me.", { fetcher }),
    ).resolves.toEqual({
      message: "분석 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.",
      status: "error",
    });
  });
});
