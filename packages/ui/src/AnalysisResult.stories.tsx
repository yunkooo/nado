import type { Meta, StoryObj } from "@storybook/react-vite";
import { AnalysisResult } from "@nado/ui";
import { analysisMock } from "./analysisStoryFixtures";

const meta = {
  component: AnalysisResult,
  title: "Analysis/AnalysisResult",
} satisfies Meta<typeof AnalysisResult>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    result: analysisMock,
  },
};

export const Narrow: Story = {
  args: {
    result: analysisMock,
  },
  render: () => (
    <div className="storybook-analysis-narrow">
      <AnalysisResult result={analysisMock} />
    </div>
  ),
};

export const WordPopoverOpen: Story = {
  args: {
    activeVocabularyKey: "framework",
    getVocabularySuggestionState: () => "idle",
    onSaveVocabularySuggestion: () => undefined,
    result: analysisMock,
  },
};

export const NarrowTapOpen: Story = {
  args: {
    activeVocabularyKey: "setup",
    getVocabularySuggestionState: () => "idle",
    onSaveVocabularySuggestion: () => undefined,
    result: analysisMock,
  },
  render: (args) => (
    <div className="storybook-analysis-narrow">
      <AnalysisResult {...args} />
    </div>
  ),
};
