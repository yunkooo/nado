/** @vitest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthStateSnapshot } from "../../auth/authState";
import type { useVocabularyManualRefresh as useVocabularyManualRefreshType } from "./useVocabularyManualRefresh";

const refreshVocabularyForAuth = vi.fn(async () => "refreshed" as const);

vi.mock("./vocabularyState", () => ({
  refreshVocabularyForAuth,
  useVocabularyState: () => ({
    accessToken: "session-token",
    items: [],
    message: null,
    status: "ready",
  }),
}));

const authState: AuthStateSnapshot = {
  accessToken: "session-token",
  session: null,
  status: "authenticated",
};

describe("useVocabularyManualRefresh", () => {
  beforeEach(() => {
    refreshVocabularyForAuth.mockReset();
    refreshVocabularyForAuth.mockResolvedValue("refreshed");
  });

  it("forces explicit manual refreshes past lifecycle freshness checks", async () => {
    const { useVocabularyManualRefresh } =
      (await import("./useVocabularyManualRefresh")) as {
        useVocabularyManualRefresh: typeof useVocabularyManualRefreshType;
      };
    const { result } = renderHook(() => useVocabularyManualRefresh(authState));

    await act(async () => {
      await result.current.refreshVocabulary();
    });

    expect(refreshVocabularyForAuth).toHaveBeenCalledWith(authState, {
      force: true,
    });
  });

  it("throttles rapid manual refresh repeats", async () => {
    const { useVocabularyManualRefresh } =
      (await import("./useVocabularyManualRefresh")) as {
        useVocabularyManualRefresh: typeof useVocabularyManualRefreshType;
      };
    const { result } = renderHook(() => useVocabularyManualRefresh(authState));

    await act(async () => {
      await result.current.refreshVocabulary();
      await result.current.refreshVocabulary();
    });

    expect(refreshVocabularyForAuth).toHaveBeenCalledTimes(1);
  });

  it("ignores a previous account refresh that settles during a new refresh", async () => {
    const firstRefresh = createDeferred<"refreshed">();
    const secondRefresh = createDeferred<"refreshed">();
    refreshVocabularyForAuth
      .mockReturnValueOnce(firstRefresh.promise)
      .mockReturnValueOnce(secondRefresh.promise);
    const { useVocabularyManualRefresh } =
      (await import("./useVocabularyManualRefresh")) as {
        useVocabularyManualRefresh: typeof useVocabularyManualRefreshType;
      };
    const nextAuthState: AuthStateSnapshot = {
      ...authState,
      accessToken: "next-session-token",
    };
    const { result, rerender } = renderHook(
      ({ state }: { state: AuthStateSnapshot }) =>
        useVocabularyManualRefresh(state),
      {
        initialProps: { state: authState },
      },
    );

    let firstRequest: Promise<void> | undefined;
    act(() => {
      firstRequest = result.current.refreshVocabulary();
    });
    rerender({ state: nextAuthState });

    let secondRequest: Promise<void> | undefined;
    act(() => {
      secondRequest = result.current.refreshVocabulary();
    });
    expect(result.current.isRefreshing).toBe(true);

    await act(async () => {
      firstRefresh.resolve("refreshed");
      await firstRequest;
    });

    expect(result.current.isRefreshing).toBe(true);

    await act(async () => {
      secondRefresh.resolve("refreshed");
      await secondRequest;
    });

    expect(result.current.isRefreshing).toBe(false);
  });
});

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}
