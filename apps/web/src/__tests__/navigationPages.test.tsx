import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ReviewPage from "../app/review/page";
import VocabularyPage from "../app/vocabulary/page";

describe("navigation pages", () => {
  it("renders the vocabulary page in the current app shell design", () => {
    const markup = renderToStaticMarkup(createElement(VocabularyPage));

    expect(markup).toContain("nado-app-shell");
    expect(markup).toContain('href="/vocabulary"');
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain("단어장");
    expect(markup).not.toContain("로그인하면 실제 단어장을 불러와요");
    expect(markup).not.toContain("로그인 전에는 목업 데이터로 흐름");
    expect(markup).toContain("nado-vocabulary-summary");
    expect(markup).toContain("nado-vocabulary-refresh");
    expect(markup).toContain("새로고침");
    expect(markup).toContain("저장 항목");
    expect(markup).toContain("로그인 상태를 확인하고 있어요");
    expect(markup).not.toContain(">3</strong>");
    expect(markup).not.toContain("복습 대기");
    expect(markup).not.toContain("최근 저장");
    expect(markup).not.toContain("단어장 항목이 아직 없어요");
    expect(markup).toContain("nado-vocabulary-flow");
    expect(markup).not.toContain("nado-vocabulary-item");
    expect(markup).not.toContain("nado-vocabulary-type");
    expect(markup).not.toContain("wondering");
    expect(markup).not.toContain("take a look");
    expect(markup).not.toContain("뜻 1개");
    expect(markup).not.toContain("뜻 2개");
    expect(markup).not.toContain("nado-composer");
  });

  it("renders the review page in the current app shell design", () => {
    const markup = renderToStaticMarkup(createElement(ReviewPage));

    expect(markup).toContain("nado-app-shell");
    expect(markup).toContain('href="/review"');
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain("복습");
    expect(markup).toContain("nado-vocabulary-refresh");
    expect(markup).toContain("새로고침");
    expect(markup).not.toContain("로그인하면 내 단어장으로 복습해요");
    expect(markup).not.toContain("로그인 전에는 목업 데이터로 정답");
    expect(markup).toContain("로그인 상태를 확인하고 있어요");
    expect(markup).not.toContain("영어 → 한국어");
    expect(markup).not.toContain("한국어 → 영어");
    expect(markup).not.toContain("복습할 단어가 없어요");
    expect(markup).not.toContain("nado-review-card");
    expect(markup).not.toContain("nado-review-card__answer");
    expect(markup).not.toContain("궁금해하다");
    expect(markup).not.toContain("정답 보기");
    expect(markup).not.toContain("nado-review-actions");
    expect(markup).not.toContain("정답은 아직 숨겨져 있어요");
    expect(markup).not.toContain("nado-composer");
  });
});
