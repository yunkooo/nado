import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

const styles = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

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

  it("does not render the topbar analysis mode copy", () => {
    const markup = renderToStaticMarkup(createElement(HomePage));

    expect(markup).not.toContain("nado-topbar__title-group");
    expect(markup).not.toContain("모드 선택 없이 자동으로 학습 흐름 적용");
  });

  it("places the Google login button at the bottom of the sidebar", () => {
    const markup = renderToStaticMarkup(createElement(HomePage));

    expect(markup).toContain("nado-sidebar__footer");
    expect(markup).toContain("nado-sidebar-login");
    expect(markup).toContain("Google 로그인");
    expect(markup).not.toContain("nado-topbar");
  });

  it("keeps the desktop sidebar fixed to the viewport height", () => {
    expect(styles).toContain("height: 100dvh");
    expect(styles).toContain("position: sticky");
    expect(styles).toContain("top: 0");
    expect(styles).toContain("overflow-y: auto");
  });
});
