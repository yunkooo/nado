/** @vitest-environment jsdom */

import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "../../test-utils/reactActEnvironment";
import type { AuthStateSnapshot } from "../auth/authState";
import type { useVocabularyManualRefresh as useVocabularyManualRefreshType } from "./useVocabularyManualRefresh";

type ManualRefreshState = ReturnType<typeof useVocabularyManualRefreshType>;

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
    let refreshVocabulary: ManualRefreshState["refreshVocabulary"] = async () =>
      undefined;

    function ManualRefreshHarness() {
      refreshVocabulary =
        useVocabularyManualRefresh(authState).refreshVocabulary;
      return null;
    }

    renderToStaticMarkup(createElement(ManualRefreshHarness));

    await refreshVocabulary?.();

    expect(refreshVocabularyForAuth).toHaveBeenCalledWith(authState, {
      force: true,
    });
  });

  it("throttles rapid manual refresh repeats", async () => {
    const { useVocabularyManualRefresh } =
      (await import("./useVocabularyManualRefresh")) as {
        useVocabularyManualRefresh: typeof useVocabularyManualRefreshType;
      };
    let refreshVocabulary: ManualRefreshState["refreshVocabulary"] = async () =>
      undefined;

    function ManualRefreshHarness() {
      refreshVocabulary =
        useVocabularyManualRefresh(authState).refreshVocabulary;
      return null;
    }

    renderToStaticMarkup(createElement(ManualRefreshHarness));

    await refreshVocabulary?.();
    await refreshVocabulary?.();

    expect(refreshVocabularyForAuth).toHaveBeenCalledTimes(1);
  });

  it("ignores an old account refresh that settles during the new account refresh", async () => {
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
    const container = document.createElement("div");
    const root = createRoot(container);
    let manualRefreshState: ManualRefreshState | undefined;

    function ManualRefreshHarness({ state }: { state: AuthStateSnapshot }) {
      manualRefreshState = useVocabularyManualRefresh(state);
      return null;
    }

    await act(async () => {
      root.render(createElement(ManualRefreshHarness, { state: authState }));
    });

    let firstRequest: Promise<void> | undefined;
    act(() => {
      firstRequest = manualRefreshState?.refreshVocabulary();
    });

    await act(async () => {
      root.render(
        createElement(ManualRefreshHarness, { state: nextAuthState }),
      );
    });

    let secondRequest: Promise<void> | undefined;
    act(() => {
      secondRequest = manualRefreshState?.refreshVocabulary();
    });
    expect(manualRefreshState?.isRefreshing).toBe(true);

    await act(async () => {
      firstRefresh.resolve("refreshed");
      await firstRequest;
    });

    expect(manualRefreshState?.isRefreshing).toBe(true);

    await act(async () => {
      secondRefresh.resolve("refreshed");
      await secondRequest;
    });

    expect(manualRefreshState?.isRefreshing).toBe(false);

    await act(async () => {
      root.unmount();
    });
  });
});

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}
