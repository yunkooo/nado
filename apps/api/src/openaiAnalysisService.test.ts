import { afterEach, describe, expect, it, vi } from "vitest";
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
  afterEach(() => {
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
      service.analyze("I was wondering if you could help me."),
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

  it("uses gpt-5.4-mini as the default analysis model", async () => {
    let request: { init?: RequestInit } | undefined;
    const fetchMock = async (_input: RequestInfo | URL, init?: RequestInit) => {
      request = { init };

      return new Response(
        JSON.stringify({
          output_text: JSON.stringify(sampleAnalyzeResponse),
        }),
        { status: 200 },
      );
    };

    const service = createOpenAIAnalysisService({
      apiKey: "test-api-key",
      fetch: fetchMock,
    });

    await service.analyze("I was wondering if you could help me.");

    const body = JSON.parse(String(request?.init?.body));

    expect(body.model).toBe("gpt-5.4-mini");
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

    await expect(service.analyze("Hello.")).rejects.toThrow(
      "OPENAI_API_KEY is required.",
    );
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

    const resultPromise = service.analyze("Hello.");
    const assertion = expect(resultPromise).rejects.toMatchObject({
      code: "analysis_timeout",
      status: 504,
    });
    await vi.advanceTimersByTimeAsync(11);

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

    await expect(service.analyze("Hello.")).resolves.toEqual(
      sampleAnalyzeResponse,
    );
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

    await expect(service.analyze("Hello.")).rejects.toThrow(
      "OpenAI structured output did not match the analysis schema.",
    );
  });
});
