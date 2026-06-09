import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

describe("Desktop App source", () => {
  it("renders the desktop analysis MVP with shared UI components", () => {
    expect(appSource).toContain("AnalysisResult");
    expect(appSource).toContain("InputComposer");
    expect(appSource).toContain("InputSample");
    expect(appSource).toContain("useAnalysisPageState");
    expect(appSource).toContain("analyzeText");
  });

  it("renders web-style mobile sidebar controls", () => {
    expect(appSource).toContain("useState");
    expect(appSource).toContain("desktop-mobile-menu-button");
    expect(appSource).toContain('aria-label="사이드바 열기"');
    expect(appSource).toContain("desktop-sidebar-scrim");
    expect(appSource).toContain('aria-label="사이드바 배경 닫기"');
    expect(appSource).toContain("desktop-sidebar-close");
    expect(appSource).toContain('aria-label="사이드바 닫기"');
    expect(appSource).toContain("desktop-sidebar--open");
  });

  it("validates analysis input before submitting to the API", () => {
    expect(appSource).toContain("normalizeAnalysisText");
    expect(appSource).toContain("countAnalysisTextCharacters");
    expect(appSource).toContain("hasUnsupportedAnalysisTextCharacters");
    expect(appSource).toContain("MAX_ANALYSIS_TEXT_LENGTH");
  });

  it("uses the root Vite API base URL variable configured for deployed backends", () => {
    expect(appSource).toContain("VITE_API_BASE_URL");
    expect(appSource).toContain("VITE_NADO_API_BASE_URL");
  });

  it("keeps vocabulary saving behind a login-needed desktop notice", () => {
    expect(appSource).toContain(
      "단어 저장은 로그인 기능 연결 후 사용할 수 있어요.",
    );
    expect(appSource).toContain("setVocabularySaveMessage");
    expect(appSource).toContain("getVocabularySuggestionState");
  });

  it("does not render a desktop-only idle placeholder card", () => {
    expect(appSource).not.toContain("desktop-empty-state");
    expect(appSource).not.toContain("영어 문장이나 짧은 문단을 입력하세요.");
    expect(styles).not.toContain(".desktop-empty-state");
  });

  it("uses the same default icon submit button as the web composer", () => {
    expect(appSource).not.toContain('actionLabel="분석"');
    expect(appSource).not.toContain('submitButtonKind="text"');
    expect(appSource).toContain('submitAriaLabel="분석 요청"');
  });

  it("does not render desktop-only sidebar intro copy", () => {
    expect(appSource).not.toContain("<h1>분석</h1>");
    expect(appSource).not.toContain(
      "웹과 같은 분석 흐름을 데스크톱에서 깔끔하게 실행합니다.",
    );
  });

  it("defines desktop analysis shell styles", () => {
    expect(styles).toContain(".desktop-shell");
    expect(styles).toContain(".desktop-sidebar");
    expect(styles).toContain(".desktop-workspace");
    expect(styles).toContain(".desktop-analysis-workspace");
    expect(styles).toContain(".desktop-analysis-page");
    expect(styles).toContain(".desktop-composer-wrap");
    expect(styles).toContain(".desktop-analysis-status");
    expect(styles).toContain(".desktop-save-status");
  });

  it("uses a drawer sidebar instead of stacking the sidebar on narrow screens", () => {
    expect(styles).toContain(".desktop-mobile-menu-button");
    expect(styles).toContain(".desktop-sidebar-close");
    expect(styles).toContain(".desktop-sidebar-scrim");
    expect(styles).toContain(".desktop-sidebar--open");
    expect(styles).toContain("position: fixed");
    expect(styles).toContain("transform: translateX(-100%)");
    expect(styles).toContain("transform: translateX(0)");
    expect(styles).toContain("padding: 72px 14px 140px");
  });

  it("aligns the desktop shell rhythm with the web app layout", () => {
    expect(styles).toContain("grid-template-columns: 224px minmax(0, 1fr)");
    expect(styles).toContain("background: var(--nado-color-sidebar)");
    expect(styles).toContain("height: 100dvh");
    expect(styles).toContain("overflow: auto");
    expect(styles).toContain("padding: 28px 28px 150px");
    expect(styles).toContain("max-width: 860px");
  });
});
