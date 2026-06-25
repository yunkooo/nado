import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ReviewCard,
  VocabularyEmptyState,
  VocabularyErrorState,
  VocabularyListItem,
} from "./index";

describe("study workflow display components", () => {
  it("renders a vocabulary list item with meaning and context", () => {
    const markup = renderToStaticMarkup(
      <VocabularyListItem
        context="A simple setup can help a small team move quickly."
        meaning="구성"
        meta="명사"
        term="setup"
      />,
    );

    expect(markup).toContain("nado-vocabulary-item");
    expect(markup).toContain("setup");
    expect(markup).toContain("구성");
    expect(markup).toContain("명사");
    expect(markup).toContain("A simple setup");
  });

  it("renders vocabulary empty and error states", () => {
    const emptyMarkup = renderToStaticMarkup(
      <VocabularyEmptyState
        description="분석 결과에서 저장한 단어가 여기에 쌓입니다."
        title="저장한 단어가 없습니다"
      />,
    );
    const errorMarkup = renderToStaticMarkup(
      <VocabularyErrorState
        description="네트워크 상태를 확인한 뒤 다시 시도하세요."
        title="단어장을 불러오지 못했습니다"
      />,
    );

    expect(emptyMarkup).toContain("nado-state-card--empty");
    expect(emptyMarkup).toContain("저장한 단어가 없습니다");
    expect(errorMarkup).toContain("nado-state-card--error");
    expect(errorMarkup).toContain("단어장을 불러오지 못했습니다");
  });

  it("hides and reveals the review card answer by state", () => {
    const hiddenMarkup = renderToStaticMarkup(
      <ReviewCard
        answer="출시/배포"
        example="The team improved shipping speed."
        isRevealed={false}
        prompt="shipping"
      />,
    );
    const revealedMarkup = renderToStaticMarkup(
      <ReviewCard
        answer="출시/배포"
        example="The team improved shipping speed."
        isRevealed
        prompt="shipping"
      />,
    );

    expect(hiddenMarkup).toContain("nado-review-card--hidden");
    expect(hiddenMarkup).toContain("정답 가림");
    expect(hiddenMarkup).not.toContain("출시/배포");
    expect(revealedMarkup).toContain("nado-review-card--revealed");
    expect(revealedMarkup).toContain("출시/배포");
    expect(revealedMarkup).toContain("The team improved shipping speed.");
  });
});
