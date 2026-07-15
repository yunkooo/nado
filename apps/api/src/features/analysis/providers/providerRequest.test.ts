import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnalyzeResponse } from "@nado/shared/analysis";
import { executeStructuredAnalysisRequest } from "./providerRequest.js";
import { parseOpenAIAnalysisResponse } from "./structuredAnalysisResponse.js";

const sampleAnalyzeResponse: AnalyzeResponse = {
  reason: "영어 학습 입력이 아닙니다.",
  status: "not_analyzable",
};

const compactAnalyzeResponse = {
  ...sampleAnalyzeResponse,
  result: null,
};

type StructuredRequestOptions = Parameters<
  typeof executeStructuredAnalysisRequest
>[0];

function executeRequest(
  overrides: Partial<StructuredRequestOptions> = {},
): Promise<AnalyzeResponse> {
  return executeStructuredAnalysisRequest({
    apiKey: "test-api-key",
    body: { input: "Hello." },
    endpoint: "https://api.openai.test/v1/responses",
    fetchImplementation: async () => Response.json(sampleAnalyzeResponse),
    parseResponse: async () => sampleAnalyzeResponse,
    provider: "OpenAI",
    timeoutMs: 1_000,
    ...overrides,
  });
}

describe("executeStructuredAnalysisRequest", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("requires an API key before making a request", async () => {
    let calls = 0;

    await expect(
      executeRequest({
        apiKey: "",
        fetchImplementation: async () => {
          calls += 1;
          return Response.json(sampleAnalyzeResponse);
        },
      }),
    ).rejects.toMatchObject({
      code: "analysis_provider_configuration_error",
      retryable: false,
      status: 503,
    });
    expect(calls).toBe(0);
  });

  it.each([
    {
      code: "analysis_provider_configuration_error",
      retryable: false,
      status: 401,
      translatedStatus: 503,
    },
    {
      code: "analysis_provider_rate_limited",
      retryable: true,
      status: 429,
      translatedStatus: 503,
    },
    {
      code: "analysis_provider_unavailable",
      retryable: true,
      status: 500,
      translatedStatus: 502,
    },
  ])(
    "classifies provider status $status as $code",
    async ({ code, retryable, status, translatedStatus }) => {
      await expect(
        executeRequest({
          fetchImplementation: async () =>
            new Response(
              JSON.stringify({ error: { code: "upstream_error" } }),
              {
                headers: { "x-request-id": "upstream-request-id" },
                status,
              },
            ),
        }),
      ).rejects.toMatchObject({
        code,
        retryable,
        status: translatedStatus,
      });
    },
  );

  it("aborts requests after the configured timeout", async () => {
    vi.useFakeTimers();

    const resultPromise = executeRequest({
      fetchImplementation: async (_input, init) =>
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
    const assertion = expect(resultPromise).rejects.toMatchObject({
      code: "analysis_timeout",
      status: 504,
    });

    await vi.advanceTimersByTimeAsync(11);
    await assertion;
  });

  it("times out when the provider fetch ignores abort signals", async () => {
    vi.useFakeTimers();

    const resultPromise = executeRequest({
      fetchImplementation: async () => new Promise<Response>(() => undefined),
      timeoutMs: 10,
    });
    const assertion = expect(resultPromise).rejects.toMatchObject({
      code: "analysis_timeout",
      status: 504,
    });

    await vi.advanceTimersByTimeAsync(11);
    await assertion;
  });

  it("retries once when structured output is malformed", async () => {
    let calls = 0;

    await expect(
      executeRequest({
        fetchImplementation: async () => {
          calls += 1;

          return new Response(
            JSON.stringify({
              output_text: JSON.stringify(
                calls === 1
                  ? { result: {}, status: "analyzable" }
                  : compactAnalyzeResponse,
              ),
            }),
            { status: 200 },
          );
        },
        parseResponse: parseOpenAIAnalysisResponse,
      }),
    ).resolves.toEqual(sampleAnalyzeResponse);
    expect(calls).toBe(2);
  });

  it("shares one timeout budget across structured output retries", async () => {
    vi.useFakeTimers();
    let calls = 0;
    let secondAttemptAborted = false;

    const resultPromise = executeRequest({
      fetchImplementation: async (_input, init) => {
        calls += 1;

        if (calls === 1) {
          return await new Promise<Response>((resolve) => {
            globalThis.setTimeout(() => {
              resolve(
                new Response(
                  JSON.stringify({
                    output_text: JSON.stringify({
                      result: {},
                      status: "analyzable",
                    }),
                  }),
                  { status: 200 },
                ),
              );
            }, 8);
          });
        }

        return await new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;

          if (signal instanceof AbortSignal) {
            signal.addEventListener("abort", () => {
              secondAttemptAborted = true;
              reject(new DOMException("Request aborted", "AbortError"));
            });
          }
        });
      },
      parseResponse: parseOpenAIAnalysisResponse,
      timeoutMs: 10,
    });
    const assertion = expect(resultPromise).rejects.toMatchObject({
      code: "analysis_timeout",
      status: 504,
    });

    await vi.advanceTimersByTimeAsync(9);
    expect(calls).toBe(2);

    await vi.advanceTimersByTimeAsync(2);

    expect(secondAttemptAborted).toBe(true);
    await assertion;
  });

  it("rejects malformed structured output", async () => {
    await expect(
      executeRequest({
        fetchImplementation: async () =>
          new Response(
            JSON.stringify({
              output_text: JSON.stringify({
                result: {},
                status: "analyzable",
              }),
            }),
            { status: 200 },
          ),
        parseResponse: parseOpenAIAnalysisResponse,
      }),
    ).rejects.toMatchObject({
      code: "invalid_analysis_response",
      retryable: true,
      status: 502,
    });
  });
});
