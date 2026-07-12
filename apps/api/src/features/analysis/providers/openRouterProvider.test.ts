import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeWithOpenRouter } from "./openRouterProvider.js";

describe("analyzeWithOpenRouter", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps the timeout active while reading the response body", async () => {
    vi.useFakeTimers();
    let aborted = false;

    const resultPromise = analyzeWithOpenRouter({
      apiKey: "test-openrouter-key",
      endpoint: "https://openrouter.test/api/v1/chat/completions",
      fetchImplementation: async (_input, init) => {
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
      instructions: "한국인 영어 학습자를 위한 분석 지침",
      model: "z-ai/glm-5.2",
      text: "Careful state design makes interface bugs easier to find.",
      timeoutMs: 10,
    });
    const assertion = expect(resultPromise).rejects.toMatchObject({
      code: "analysis_timeout",
      status: 504,
    });

    await vi.advanceTimersByTimeAsync(11);

    expect(aborted).toBe(true);
    await assertion;
  });
});
