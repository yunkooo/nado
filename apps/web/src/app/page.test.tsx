import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("HomePage", () => {
  it("renders the PRD analysis flow from the Storybook components", () => {
    const markup = renderToStaticMarkup(createElement(HomePage));

    expect(markup).toContain("기본 분석");
    expect(markup).toContain("입력 예시");
    expect(markup).toContain("분석 결과");
    expect(markup).toContain("전체 자연스러운 번역");
    expect(markup).toContain("번역 포인트");
    expect(markup).toContain("문장별 분석");
    expect(markup).toContain("우선 저장 추천");
    expect(markup).toContain("입력한 문장은 AI 분석을 위해 전송되며");
    expect(markup).toContain('aria-label="분석 요청"');
  });

  it("keeps the submit button disabled when the composer is empty", () => {
    const markup = renderToStaticMarkup(createElement(HomePage));

    expect(markup).toContain("0 / 500");
    expect(markup).toContain("disabled");
  });
});
