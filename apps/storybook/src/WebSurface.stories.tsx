import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ReactNode } from "react";
import { expect, userEvent, within } from "storybook/test";
import {
  ANALYSIS_MODELS,
  DEFAULT_ANALYSIS_MODEL_ID,
  MAX_ANALYSIS_TEXT_LENGTH,
  countAnalysisTextCharacters,
} from "@nado/shared/analysis-input";
import { AnalysisResult, InputComposer, InputSample } from "@nado/ui";
import {
  AppShellView,
  type AppShellLinkProps,
  type AppShellNavigationKey,
} from "../../web/src/components/AppShellView";
import { analysisSurfaceMock } from "../../../packages/ui-web/src/analysisStoryFixtures";
import "../../web/src/app/styles/base.css";
import "../../web/src/app/styles/shell.css";
import "../../web/src/app/styles/analysis.css";
import "../../web/src/app/styles/study.css";

interface WebShellStoryProps {
  activeItem: AppShellNavigationKey;
  children: ReactNode;
  initialSidebarOpen?: boolean;
  workspaceLabel: string;
}

function WebAuthMock() {
  return (
    <div className="nado-auth-controls" aria-label="로그인 상태">
      <span className="nado-auth-controls__user">mock.user@nado.dev</span>
      <p className="nado-auth-controls__message">Storybook mock session</p>
    </div>
  );
}

function StorybookLink({ onClick, ...props }: AppShellLinkProps) {
  return (
    <a
      {...props}
      onClick={(event) => {
        event.preventDefault();
        onClick();
      }}
    />
  );
}

function WebShellStory({
  activeItem,
  children,
  initialSidebarOpen = false,
  workspaceLabel,
}: WebShellStoryProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(initialSidebarOpen);

  return (
    <AppShellView
      activeItem={activeItem}
      authControls={<WebAuthMock />}
      isSidebarOpen={isSidebarOpen}
      linkComponent={StorybookLink}
      onCloseSidebar={() => setIsSidebarOpen(false)}
      onOpenSidebar={() => setIsSidebarOpen(true)}
      workspaceLabel={workspaceLabel}
    >
      {children}
    </AppShellView>
  );
}

function WebAnalysisSurface({
  isSidebarOpen = false,
}: {
  isSidebarOpen?: boolean;
}) {
  return (
    <WebShellStory
      activeItem="analysis"
      initialSidebarOpen={isSidebarOpen}
      workspaceLabel="분석 화면"
    >
      <section className="nado-analysis-workspace nado-analysis-workspace--has-result">
        <div className="nado-analysis-page">
          <InputSample
            count={countAnalysisTextCharacters(analysisSurfaceMock.sourceText)}
            maxLength={MAX_ANALYSIS_TEXT_LENGTH}
            text={analysisSurfaceMock.sourceText}
          />
          <AnalysisResult
            activeVocabularyKey="framework"
            getVocabularySuggestionState={() => "idle"}
            onSaveVocabularySuggestion={() => undefined}
            result={analysisSurfaceMock}
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
    </WebShellStory>
  );
}

function WebVocabularyShell() {
  return (
    <WebShellStory activeItem="vocabulary" workspaceLabel="단어장 화면">
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
    </WebShellStory>
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const closeButton = canvas.getByRole("button", {
      name: "사이드바 닫기",
    });

    await expect(closeButton).toBeVisible();
    await userEvent.click(closeButton);
    await expect(
      canvas.getByRole("button", { name: "사이드바 열기" }),
    ).toBeVisible();
  },
};
