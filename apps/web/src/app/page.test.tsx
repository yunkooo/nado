import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

const styles = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

describe("HomePage", () => {
  it("renders the initial analysis screen without a result placeholder", () => {
    const markup = renderToStaticMarkup(createElement(HomePage));

    expect(markup).toContain("기본 분석");
    expect(markup).toContain("입력한 문장은 AI 분석을 위해 전송되며");
    expect(markup).toContain('aria-label="분석 요청"');
    expect(markup).not.toContain("nado-empty-result");
    expect(markup).not.toContain("아직 분석 결과가 없어요");
    expect(markup).not.toContain("nado-input-sample");
    expect(markup).not.toContain("nado-result-card");
    expect(markup).not.toContain("전체 자연스러운 번역");
  });

  it("keeps the submit button disabled when the composer is empty", () => {
    const markup = renderToStaticMarkup(createElement(HomePage));

    expect(markup).toContain("0 / 200");
    expect(markup).toContain("disabled");
  });

  it("does not render the topbar analysis mode copy", () => {
    const markup = renderToStaticMarkup(createElement(HomePage));

    expect(markup).not.toContain("nado-topbar__title-group");
    expect(markup).not.toContain("모드 선택 없이 자동으로 학습 흐름 적용");
  });

  it("places the Google login button at the bottom of the sidebar", () => {
    const markup = renderToStaticMarkup(createElement(HomePage));

    expect(markup).toContain('id="nado-sidebar"');
    expect(markup).toContain("nado-sidebar__footer");
    expect(markup).toContain("nado-sidebar-login");
    expect(markup).toContain("Google 로그인");
    expect(markup).not.toContain("nado-topbar");
  });

  it("renders a collapsed mobile sidebar trigger", () => {
    const markup = renderToStaticMarkup(createElement(HomePage));

    expect(markup).toContain("nado-mobile-menu-button");
    expect(markup).toContain('aria-label="사이드바 열기"');
    expect(markup).toContain('aria-controls="nado-sidebar"');
    expect(markup).toContain('aria-expanded="false"');
  });

  it("renders a close button inside the sidebar header", () => {
    const markup = renderToStaticMarkup(createElement(HomePage));

    expect(markup).toContain("nado-sidebar__header");
    expect(markup).toContain("nado-sidebar-close");
    expect(markup).toContain('aria-label="사이드바 닫기"');
  });

  it("keeps the desktop sidebar fixed to the viewport height", () => {
    expect(styles).toContain("height: 100dvh");
    expect(styles).toContain("position: sticky");
    expect(styles).toContain("top: 0");
    expect(styles).toContain("overflow-y: auto");
  });

  it("defines the mobile drawer sidebar styles", () => {
    expect(styles).toContain(".nado-mobile-menu-button");
    expect(styles).toContain(".nado-sidebar-close");
    expect(styles).toContain(".nado-sidebar--open");
    expect(styles).toContain("transform: translateX(-100%)");
    expect(styles).toContain("transform: translateX(0)");
    expect(styles).toContain(".nado-sidebar-scrim");
  });

  it("defines submitted analysis status styles", () => {
    expect(styles).toContain(".nado-analysis-status");
    expect(styles).toContain("min-height: 96px");
  });

  it("defines blurred review answer styles", () => {
    expect(styles).toContain(".nado-review-card__answer");
    expect(styles).toContain("filter: blur(5px)");
  });

  it("defines polished vocabulary page styles", () => {
    expect(styles).toContain(".nado-vocabulary-summary");
    expect(styles).toContain(".nado-vocabulary-flow");
    expect(styles).toContain(".nado-vocabulary-type");
    expect(styles).toContain(".nado-vocabulary-item__date");
    expect(styles).toContain(".nado-vocabulary-meaning");
    expect(styles).toContain(".nado-review-card__answer--revealed");
  });
});
