import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_ANALYSIS_MODEL_ID } from "@nado/shared";
import { createOpenAIAnalysisService } from "./openaiAnalysisService.js";

const sampleAnalyzeResponse = {
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
} as const;

describe("createOpenAIAnalysisService", () => {
  const originalOpenAITimeoutMs = process.env.OPENAI_TIMEOUT_MS;
  const originalOpenRouterTimeoutMs = process.env.OPENROUTER_TIMEOUT_MS;

  afterEach(() => {
    if (originalOpenAITimeoutMs === undefined) {
      delete process.env.OPENAI_TIMEOUT_MS;
    } else {
      process.env.OPENAI_TIMEOUT_MS = originalOpenAITimeoutMs;
    }

    if (originalOpenRouterTimeoutMs === undefined) {
      delete process.env.OPENROUTER_TIMEOUT_MS;
    } else {
      process.env.OPENROUTER_TIMEOUT_MS = originalOpenRouterTimeoutMs;
    }

    vi.useRealTimers();
  });

  it("sends a structured Responses API request and parses output text", async () => {
    let request: { input: RequestInfo | URL; init?: RequestInit } | undefined;
    const fetchMock = async (input: RequestInfo | URL, init?: RequestInit) => {
      request = { input, init };

      return new Response(
        JSON.stringify({
          output: [
            {
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify(sampleAnalyzeResponse),
                },
              ],
            },
          ],
        }),
        { status: 200 },
      );
    };

    const service = createOpenAIAnalysisService({
      apiKey: "test-api-key",
      endpoint: "https://api.openai.test/v1/responses",
      fetch: fetchMock,
      model: "gpt-test",
    });

    await expect(
      service.analyze({
        text: "I was wondering if you could help me.",
        model: "gpt-5.4-mini",
      }),
    ).resolves.toEqual(sampleAnalyzeResponse);

    expect(request?.input).toBe("https://api.openai.test/v1/responses");
    expect(request?.init?.method).toBe("POST");
    expect(request?.init?.headers).toMatchObject({
      Authorization: "Bearer test-api-key",
      "Content-Type": "application/json",
    });

    const body = JSON.parse(String(request?.init?.body));

    expect(body).toMatchObject({
      input: "I was wondering if you could help me.",
      model: "gpt-test",
      store: false,
      text: {
        format: {
          name: "nado_analysis_response",
          strict: true,
          type: "json_schema",
        },
      },
    });
    expect(body.instructions).toContain("한국인 영어 학습자");
    expect(body.text.format.schema).toBeTruthy();
  });

  it("uses Kimi through OpenRouter as the default analysis model", async () => {
    let request: { input: RequestInfo | URL; init?: RequestInit } | undefined;
    const fetchMock = async (input: RequestInfo | URL, init?: RequestInit) => {
      request = { input, init };

      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify(sampleAnalyzeResponse),
              },
            },
          ],
        }),
        { status: 200 },
      );
    };

    const service = createOpenAIAnalysisService({
      openRouterApiKey: "test-openrouter-key",
      openRouterEndpoint: "https://openrouter.test/api/v1/chat/completions",
      fetch: fetchMock,
    });

    await service.analyze({ text: "I was wondering if you could help me." });

    const body = JSON.parse(String(request?.init?.body));

    expect(request?.input).toBe(
      "https://openrouter.test/api/v1/chat/completions",
    );
    expect(request?.init?.headers).toMatchObject({
      Authorization: "Bearer test-openrouter-key",
      "Content-Type": "application/json",
    });
    expect(body.model).toBe(DEFAULT_ANALYSIS_MODEL_ID);
    expect(body.messages).toEqual([
      expect.objectContaining({
        role: "system",
      }),
      {
        content: "I was wondering if you could help me.",
        role: "user",
      },
    ]);
    expect(body.response_format).toMatchObject({
      json_schema: {
        name: "nado_analysis_response",
        strict: true,
      },
      type: "json_schema",
    });
    expect(body.provider).toEqual({
      require_parameters: true,
    });
  });

  it("normalizes predicate adverb chunks so repeated platform analyses keep stable boundaries", async () => {
    const responseWithSplitPredicate = {
      ...sampleAnalyzeResponse,
      result: {
        ...sampleAnalyzeResponse.result,
        translation: "의미 있는 변화는 종종 조용히 시작됩니다.",
        sentences: [
          {
            ...sampleAnalyzeResponse.result.sentences[0],
            source: "That meaningful change often begins quietly.",
            translation: "의미 있는 변화는 종종 조용히 시작됩니다.",
            chunks: [
              {
                english: "That meaningful change",
                literalTranslation: "의미 있는 변화가",
                role: "주어 역할을 합니다.",
              },
              {
                english: "often begins quietly",
                literalTranslation: "종종 조용히 시작됩니다",
                role: "빈도 부사와 동사가 이어지는 서술부입니다.",
              },
            ],
          },
        ],
      },
    };
    const service = createOpenAIAnalysisService({
      apiKey: "test-api-key",
      fetch: async () =>
        new Response(
          JSON.stringify({
            output_text: JSON.stringify(responseWithSplitPredicate),
          }),
          { status: 200 },
        ),
    });

    await expect(
      service.analyze({
        text: "That meaningful change often begins quietly.",
        model: "gpt-5.4-mini",
      }),
    ).resolves.toMatchObject({
      result: {
        sentences: [
          {
            chunks: [
              {
                english: "That meaningful change often begins quietly",
                literalTranslation: "의미 있는 변화가 종종 조용히 시작됩니다",
              },
            ],
          },
        ],
      },
    });
  });

  it("requires an OpenAI API key before making a request", async () => {
    let calls = 0;
    const service = createOpenAIAnalysisService({
      apiKey: "",
      fetch: async () => {
        calls += 1;

        return new Response("{}", { status: 200 });
      },
    });

    await expect(
      service.analyze({ text: "Hello.", model: "gpt-5.4-mini" }),
    ).rejects.toThrow("OPENAI_API_KEY is required.");
    expect(calls).toBe(0);
  });

  it("aborts OpenAI requests after the configured timeout", async () => {
    vi.useFakeTimers();
    const service = createOpenAIAnalysisService({
      apiKey: "test-api-key",
      fetch: async (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;

          if (signal instanceof AbortSignal) {
            signal.addEventListener("abort", () => {
              reject(new DOMException("Request aborted", "AbortError"));
            });
          }
        }),
      timeoutMs: 10,
    });

    const resultPromise = service.analyze({
      text: "Hello.",
      model: "gpt-5.4-mini",
    });
    const assertion = expect(resultPromise).rejects.toMatchObject({
      code: "analysis_timeout",
      status: 504,
    });
    await vi.advanceTimersByTimeAsync(11);

    await assertion;
  });

  it("uses OPENAI_TIMEOUT_MS when no timeout option is provided", async () => {
    process.env.OPENAI_TIMEOUT_MS = "20";
    vi.useFakeTimers();
    let aborted = false;
    const service = createOpenAIAnalysisService({
      apiKey: "test-api-key",
      fetch: async (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;

          if (signal instanceof AbortSignal) {
            signal.addEventListener("abort", () => {
              aborted = true;
              reject(new DOMException("Request aborted", "AbortError"));
            });
          }
        }),
    });

    const resultPromise = service.analyze({
      text: "Hello.",
      model: "gpt-5.4-mini",
    });
    const assertion = expect(resultPromise).rejects.toMatchObject({
      code: "analysis_timeout",
      status: 504,
    });

    await vi.advanceTimersByTimeAsync(21);

    expect(aborted).toBe(true);
    await assertion;
  });

  it("keeps the OpenRouter timeout active while reading the response body", async () => {
    vi.useFakeTimers();
    let aborted = false;
    const service = createOpenAIAnalysisService({
      openRouterApiKey: "test-openrouter-key",
      fetch: async (_input, init) => {
        const signal = init?.signal;

        return {
          ok: true,
          json: () =>
            new Promise((_resolve, reject) => {
              if (signal instanceof AbortSignal) {
                signal.addEventListener("abort", () => {
                  aborted = true;
                  reject(new DOMException("Request aborted", "AbortError"));
                });
              }
            }),
        } as Response;
      },
      timeoutMs: 10,
    });

    const resultPromise = service.analyze({
      text: "Careful state design makes interface bugs easier to find.",
      model: "z-ai/glm-5.2",
    });
    const assertion = expect(resultPromise).rejects.toMatchObject({
      code: "analysis_timeout",
      status: 504,
    });

    await vi.advanceTimersByTimeAsync(11);

    expect(aborted).toBe(true);
    await assertion;
  });

  it("uses OPENROUTER_TIMEOUT_MS for OpenRouter response body reads", async () => {
    process.env.OPENROUTER_TIMEOUT_MS = "40";
    vi.useFakeTimers();
    let aborted = false;
    const service = createOpenAIAnalysisService({
      openRouterApiKey: "test-openrouter-key",
      fetch: async (_input, init) => {
        const signal = init?.signal;

        return {
          ok: true,
          json: () =>
            new Promise((_resolve, reject) => {
              if (signal instanceof AbortSignal) {
                signal.addEventListener("abort", () => {
                  aborted = true;
                  reject(new DOMException("Request aborted", "AbortError"));
                });
              }
            }),
        } as Response;
      },
    });

    const resultPromise = service.analyze({
      text: "Careful state design makes interface bugs easier to find.",
      model: "z-ai/glm-5.2",
    });
    const assertion = expect(resultPromise).rejects.toMatchObject({
      code: "analysis_timeout",
      status: 504,
    });

    await vi.advanceTimersByTimeAsync(41);

    expect(aborted).toBe(true);
    await assertion;
  });

  it("retries once when structured output is malformed", async () => {
    let calls = 0;
    const service = createOpenAIAnalysisService({
      apiKey: "test-api-key",
      fetch: async () => {
        calls += 1;

        if (calls === 1) {
          return new Response(
            JSON.stringify({
              output_text: JSON.stringify({
                result: {},
                status: "analyzable",
              }),
            }),
            { status: 200 },
          );
        }

        return new Response(
          JSON.stringify({
            output_text: JSON.stringify(sampleAnalyzeResponse),
          }),
          { status: 200 },
        );
      },
    });

    await expect(
      service.analyze({ text: "Hello.", model: "gpt-5.4-mini" }),
    ).resolves.toEqual(sampleAnalyzeResponse);
    expect(calls).toBe(2);
  });

  it("rejects malformed structured output", async () => {
    const service = createOpenAIAnalysisService({
      apiKey: "test-api-key",
      fetch: async () =>
        new Response(
          JSON.stringify({
            output_text: JSON.stringify({
              result: {},
              status: "analyzable",
            }),
          }),
          { status: 200 },
        ),
    });

    await expect(
      service.analyze({ text: "Hello.", model: "gpt-5.4-mini" }),
    ).rejects.toThrow(
      "OpenAI structured output did not match the analysis schema.",
    );
  });
});
