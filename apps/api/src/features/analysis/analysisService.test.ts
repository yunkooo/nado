import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_ANALYSIS_MODEL_ID,
  MAX_ANALYSIS_PROVIDER_OUTPUT_TOKENS,
} from "@nado/shared/analysis-input";
import { createAnalysisService } from "./analysisService.js";

const sampleAnalyzeResponse = {
  reason: "영어 학습 입력이 아닙니다.",
  result: null,
  status: "not_analyzable",
} as const;

describe("createAnalysisService", () => {
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

    const service = createAnalysisService({
      fetch: fetchMock,
      openRouterApiKey: "test-openrouter-key",
      openRouterEndpoint: "https://openrouter.test/api/v1/chat/completions",
    });

    await service.analyze({
      text: "I was wondering if you could help me.",
    } as Parameters<typeof service.analyze>[0]);

    const body = JSON.parse(String(request?.init?.body));

    expect(request?.input).toBe(
      "https://openrouter.test/api/v1/chat/completions",
    );
    expect(request?.init?.headers).toMatchObject({
      Authorization: "Bearer test-openrouter-key",
      "Content-Type": "application/json",
    });
    expect(body.model).toBe(DEFAULT_ANALYSIS_MODEL_ID);
    expect(body.max_tokens).toBe(MAX_ANALYSIS_PROVIDER_OUTPUT_TOKENS);
    expect(body.messages).toEqual([
      expect.objectContaining({
        content: expect.stringContaining("한국인 영어 학습자"),
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
      allow_fallbacks: false,
      only: ["moonshotai/int4"],
      require_parameters: true,
      sort: "throughput",
    });
    expect(body).not.toHaveProperty("reasoning");
    expect(body).not.toHaveProperty("temperature");
  });

  it("disables optional GLM reasoning for shorter structured responses", async () => {
    let request: { init?: RequestInit } | undefined;
    const service = createAnalysisService({
      fetch: async (_input, init) => {
        request = { init };

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
      },
      openRouterApiKey: "test-openrouter-key",
    });

    await service.analyze({
      model: "z-ai/glm-5.2",
      text: "Careful tests keep the product reliable.",
    });

    const body = JSON.parse(String(request?.init?.body));

    expect(body.provider).toEqual({
      require_parameters: true,
      sort: "throughput",
    });
    expect(body.reasoning).toEqual({ enabled: false });
    expect(body.temperature).toBe(0);
  });

  it("uses OPENAI_TIMEOUT_MS when no timeout option is provided", async () => {
    process.env.OPENAI_TIMEOUT_MS = "20";
    vi.useFakeTimers();
    let aborted = false;
    const service = createAnalysisService({
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

  it("uses OPENROUTER_TIMEOUT_MS for OpenRouter response body reads", async () => {
    process.env.OPENROUTER_TIMEOUT_MS = "40";
    vi.useFakeTimers();
    let aborted = false;
    const service = createAnalysisService({
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
      openRouterApiKey: "test-openrouter-key",
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

  it("keeps the default OpenRouter timeout above slow GLM responses", async () => {
    vi.useFakeTimers();
    let aborted = false;
    const service = createAnalysisService({
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
      openRouterApiKey: "test-openrouter-key",
    });

    const resultPromise = service.analyze({
      text: "Careful state design makes interface bugs easier to find.",
      model: "z-ai/glm-5.2",
    });
    const assertion = expect(resultPromise).rejects.toMatchObject({
      code: "analysis_timeout",
      status: 504,
    });

    await vi.advanceTimersByTimeAsync(120_000);
    expect(aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(30_001);
    expect(aborted).toBe(true);
    await assertion;
  });
});
