import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  ANALYSIS_MODELS,
  DEFAULT_ANALYSIS_MODEL_ID,
  MAX_ANALYSIS_TEXT_LENGTH,
} from "@nado/shared";
import { AnalysisResult, InputComposer, InputSample } from "@nado/ui";
import { analysisMock } from "../../../packages/ui-web/src/analysisStoryFixtures";

function AnalysisPageMockView() {
  return (
    <div className="storybook-analysis-shell">
      <aside className="storybook-analysis-sidebar">
        <div className="storybook-analysis-brand">
          <span className="storybook-analysis-mark">n</span>
          <span>nado</span>
        </div>
        <nav className="storybook-analysis-nav" aria-label="주요 메뉴">
          <span className="storybook-analysis-nav__item storybook-analysis-nav__item--active">
            분석
          </span>
          <span className="storybook-analysis-nav__item">단어장</span>
          <span className="storybook-analysis-nav__item">복습</span>
        </nav>
      </aside>
      <main className="storybook-analysis-main">
        <section className="storybook-analysis-workspace">
          <div className="storybook-analysis-page">
            <InputSample
              count={487}
              maxLength={MAX_ANALYSIS_TEXT_LENGTH}
              text={analysisMock.sourceText}
            />
            <AnalysisResult result={analysisMock} />
          </div>
        </section>
        <footer className="storybook-analysis-composer">
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
      </main>
    </div>
  );
}

const meta = {
  component: AnalysisPageMockView,
  parameters: {
    layout: "fullscreen",
  },
  title: "Analysis/AnalysisPageMock",
} satisfies Meta<typeof AnalysisPageMockView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = {};
