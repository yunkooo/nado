import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
    refreshVocabularyForAuth.mockClear();
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
});
