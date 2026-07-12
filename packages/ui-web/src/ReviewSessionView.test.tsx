import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ReviewSessionView } from "./ReviewSessionView";

describe("ReviewSessionView", () => {
  it("renders the shared Web/Desktop review contract", () => {
    const markup = renderToStaticMarkup(
      <ReviewSessionView
        card={{ answer: "검토하다", prompt: "go over" }}
        currentIndex={1}
        direction="english-to-korean"
        isAnswerRevealed={false}
        itemCount={3}
        onChangeDirection={vi.fn()}
        onMoveNext={vi.fn()}
        onToggleAnswer={vi.fn()}
      />,
    );

    expect(markup).toContain('aria-label="복습 방향"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain("2 / 3");
    expect(markup).toContain("go over");
    expect(markup).toContain("정답 보기");
  });
});
