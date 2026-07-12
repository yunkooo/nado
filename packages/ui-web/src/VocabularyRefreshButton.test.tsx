import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { VocabularyRefreshButton } from "./VocabularyRefreshButton";

describe("VocabularyRefreshButton", () => {
  it("renders the shared Web/Desktop loading and error contract", () => {
    const loadingMarkup = renderToStaticMarkup(
      <VocabularyRefreshButton
        isDisabled={false}
        isRefreshing
        message={null}
        onRefresh={vi.fn()}
      />,
    );
    const errorMarkup = renderToStaticMarkup(
      <VocabularyRefreshButton
        isDisabled={false}
        isRefreshing={false}
        message="단어장을 새로고침하지 못했어요."
        onRefresh={vi.fn()}
      />,
    );

    expect(loadingMarkup).toContain('aria-label="단어장 새로고침"');
    expect(loadingMarkup).toContain('aria-busy="true"');
    expect(loadingMarkup).toContain("disabled");
    expect(errorMarkup).toContain('role="alert"');
  });
});
