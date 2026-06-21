import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VocabularyRefreshButton } from "./VocabularyRefreshButton";

describe("VocabularyRefreshButton", () => {
  it("renders a compact manual refresh control", () => {
    const markup = renderToStaticMarkup(
      createElement(VocabularyRefreshButton, {
        isDisabled: false,
        isRefreshing: false,
        message: null,
        onRefresh: () => undefined,
      }),
    );

    expect(markup).toContain('aria-label="단어장 새로고침"');
    expect(markup).toContain("새로고침");
    expect(markup).toContain("nado-vocabulary-refresh");
  });

  it("keeps the refresh button disabled while a manual refresh is running", () => {
    const markup = renderToStaticMarkup(
      createElement(VocabularyRefreshButton, {
        isDisabled: false,
        isRefreshing: true,
        message: "단어장을 새로고침하고 있어요.",
        onRefresh: () => undefined,
      }),
    );

    expect(markup).toContain("disabled");
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain("새로고침 중");
  });

  it("shows refresh failures without replacing the current screen", () => {
    const markup = renderToStaticMarkup(
      createElement(VocabularyRefreshButton, {
        isDisabled: false,
        isRefreshing: false,
        message: "단어장을 새로고침하지 못했어요.",
        onRefresh: () => undefined,
      }),
    );

    expect(markup).toContain('role="alert"');
    expect(markup).toContain("단어장을 새로고침하지 못했어요.");
  });
});
