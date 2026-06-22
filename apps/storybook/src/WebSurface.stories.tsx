import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import {
  ANALYSIS_MODELS,
  DEFAULT_ANALYSIS_MODEL_ID,
  MAX_ANALYSIS_TEXT_LENGTH,
  countAnalysisTextCharacters,
} from "@nado/shared";
import { AnalysisResult, InputComposer, InputSample } from "@nado/ui";
import { analysisMock } from "../../../packages/ui/src/analysisStoryFixtures";
import "../../web/src/app/styles/base.css";
import "../../web/src/app/styles/shell.css";
import "../../web/src/app/styles/analysis.css";
import "../../web/src/app/styles/study.css";

type WebSurfaceKey = "analysis" | "review" | "vocabulary";

interface WebShellMockProps {
  activeItem: WebSurfaceKey;
  children: ReactNode;
  isSidebarOpen?: boolean;
  workspaceLabel: string;
}

const webNavigationItems: {
  href: string;
  key: WebSurfaceKey;
  label: string;
}[] = [
  { href: "/", key: "analysis", label: "분석" },
  { href: "/vocabulary", key: "vocabulary", label: "단어장" },
  { href: "/review", key: "review", label: "복습" },
];

function WebAuthMock() {
  return (
    <div className="nado-auth-controls" aria-label="로그인 상태">
      <span className="nado-auth-controls__user">mock.user@nado.dev</span>
      <p className="nado-auth-controls__message">Storybook mock session</p>
    </div>
  );
}

function WebShellMock({
  activeItem,
  children,
  isSidebarOpen = false,
  workspaceLabel,
}: WebShellMockProps) {
  return (
    <main className="nado-app-shell">
      {!isSidebarOpen ? (
        <button
          aria-controls="nado-sidebar"
          aria-expanded="false"
          aria-label="사이드바 열기"
          className="nado-mobile-menu-button"
          type="button"
        >
          <span className="nado-mobile-menu-button__bar" />
          <span className="nado-mobile-menu-button__bar" />
          <span className="nado-mobile-menu-button__bar" />
        </button>
      ) : null}
      {isSidebarOpen ? (
        <button
          aria-label="사이드바 배경 닫기"
          className="nado-sidebar-scrim"
          type="button"
        />
      ) : null}
      <aside
        aria-label="주요 화면"
        className={["nado-sidebar", isSidebarOpen ? "nado-sidebar--open" : null]
          .filter(Boolean)
          .join(" ")}
        id="nado-sidebar"
      >
        <div className="nado-sidebar__main">
          <header className="nado-sidebar__header">
            <div className="nado-brand">
              <span className="nado-brand__mark" aria-hidden="true">
                n
              </span>
              <strong className="nado-brand__name">nado</strong>
            </div>
            <button
              aria-label="사이드바 닫기"
              className="nado-sidebar-close"
              type="button"
            >
              <span className="nado-sidebar-close__bar" />
              <span className="nado-sidebar-close__bar" />
            </button>
          </header>
          <nav className="nado-nav" aria-label="주요 메뉴">
            {webNavigationItems.map((item) => {
              const isActive = item.key === activeItem;

              return (
                <a
                  aria-current={isActive ? "page" : undefined}
                  className={[
                    "nado-nav__item",
                    isActive ? "nado-nav__item--active" : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  href={item.href}
                  key={item.key}
                  onClick={(event) => event.preventDefault()}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>
        </div>
        <footer className="nado-sidebar__footer">
          <WebAuthMock />
        </footer>
      </aside>

      <section className="nado-workspace" aria-label={workspaceLabel}>
        {children}
      </section>
    </main>
  );
}

function WebAnalysisSurface({
  isSidebarOpen = false,
}: {
  isSidebarOpen?: boolean;
}) {
  return (
    <WebShellMock
      activeItem="analysis"
      isSidebarOpen={isSidebarOpen}
      workspaceLabel="분석 화면"
    >
      <section className="nado-analysis-workspace nado-analysis-workspace--has-result">
        <div className="nado-analysis-page">
          <InputSample
            count={countAnalysisTextCharacters(analysisMock.sourceText)}
            maxLength={MAX_ANALYSIS_TEXT_LENGTH}
            text={analysisMock.sourceText}
          />
          <AnalysisResult
            activeVocabularyKey="framework"
            getVocabularySuggestionState={() => "idle"}
            onSaveVocabularySuggestion={() => undefined}
            result={analysisMock}
          />
        </div>
      </section>
      <footer className="nado-composer-wrap">
        <p className="nado-input-disclosure">
          입력문은 분석에만 사용되며 저장되지 않습니다.
        </p>
        <InputComposer
          maxLength={MAX_ANALYSIS_TEXT_LENGTH}
          modelOptions={ANALYSIS_MODELS}
          modelValue={DEFAULT_ANALYSIS_MODEL_ID}
          onSubmit={() => undefined}
          onModelChange={() => undefined}
          onValueChange={() => undefined}
          placeholder="영어 문장이나 짧은 문단을 붙여넣으세요"
          submitAriaLabel="분석 요청"
          value=""
        />
      </footer>
    </WebShellMock>
  );
}

function WebVocabularyShell() {
  return (
    <WebShellMock activeItem="vocabulary" workspaceLabel="단어장 화면">
      <section className="nado-content-workspace">
        <div className="nado-page">
          <header className="nado-page-header">
            <div>
              <p className="nado-eyebrow">Vocabulary</p>
              <h1 className="nado-page-title">단어장</h1>
            </div>
          </header>
          <section className="nado-page-notice">
            <strong>오늘 저장한 표현 3개</strong>
            <span>mock 상태로 고정된 Web shell surface</span>
          </section>
        </div>
      </section>
    </WebShellMock>
  );
}

const meta = {
  parameters: {
    layout: "fullscreen",
  },
  title: "Web/AppShell",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const AppShellVocabulary: Story = {
  render: () => <WebVocabularyShell />,
};

export const AnalysisSurface: Story = {
  render: () => <WebAnalysisSurface />,
};

export const NarrowSidebarOpen: Story = {
  globals: {
    viewport: {
      value: "mobile1",
    },
  },
  render: () => <WebAnalysisSurface isSidebarOpen />,
};
