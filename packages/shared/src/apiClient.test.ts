import { describe, expect, it, vi } from "vitest";
import { fetchWithTimeout } from "./index";

describe("fetchWithTimeout", () => {
  it("returns the timeout result even when a fetch implementation ignores abort signals", async () => {
    vi.useFakeTimers();

    try {
      const fetcher = vi.fn(() => new Promise<Response>(() => undefined));
      const resultPromise = fetchWithTimeout(
        "https://api.example.com/resource",
        { method: "GET" },
        {
          fallbackMessage: "연결에 실패했어요.",
          fetcher,
          timeoutMessage: "요청 시간이 오래 걸리고 있어요.",
          timeoutMs: 5,
        },
      );

      await vi.advanceTimersByTimeAsync(5);

      await expect(resultPromise).resolves.toEqual({
        message: "요청 시간이 오래 걸리고 있어요.",
        status: "error",
      });
      expect(fetcher).toHaveBeenCalledWith(
        "https://api.example.com/resource",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps caller-requested cancellation distinct from a timeout", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetcher = vi.fn(async () => {
      throw new DOMException("Aborted", "AbortError");
    });

    await expect(
      fetchWithTimeout(
        "https://api.example.com/resource",
        { signal: controller.signal },
        {
          fallbackMessage: "연결에 실패했어요.",
          fetcher,
          timeoutMessage: "요청 시간이 오래 걸리고 있어요.",
        },
      ),
    ).resolves.toEqual({
      message: "연결에 실패했어요.",
      status: "error",
    });
  });
});
