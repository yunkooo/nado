import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ReviewPage from "./review/page";
import VocabularyPage from "./vocabulary/page";

describe("navigation pages", () => {
  it("renders the vocabulary page in the current app shell design", () => {
    const markup = renderToStaticMarkup(createElement(VocabularyPage));

    expect(markup).toContain("nado-app-shell");
    expect(markup).toContain('href="/vocabulary" aria-current="page"');
    expect(markup).toContain("단어장");
    expect(markup).toContain("Google 로그인이 필요해요");
    expect(markup).toContain("단어장 항목이 아직 없어요");
    expect(markup).toContain("nado-vocabulary-item");
    expect(markup).not.toContain("nado-composer");
  });

  it("renders the review page in the current app shell design", () => {
    const markup = renderToStaticMarkup(createElement(ReviewPage));

    expect(markup).toContain("nado-app-shell");
    expect(markup).toContain('href="/review" aria-current="page"');
    expect(markup).toContain("복습");
    expect(markup).toContain("Google 로그인이 필요해요");
    expect(markup).toContain("영어 → 한국어");
    expect(markup).toContain("복습할 단어가 없어요");
    expect(markup).toContain("nado-review-card");
    expect(markup).toContain("nado-review-card__answer");
    expect(markup).toContain("궁금해하다");
    expect(markup).not.toContain("정답은 아직 숨겨져 있어요");
    expect(markup).not.toContain("nado-composer");
  });
});
