import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { AnalysisResult } from "@nado/ui-web";
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
    onSaveVocabularySuggestion: fn(),
    result: analysisMock,
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement.ownerDocument.body);
    const popover = canvas.getByRole("group", {
      name: "framework 뜻과 저장 액션",
    });
    const saveButton = within(popover).getByRole("button", {
      name: "framework 저장",
    });

    await expect(saveButton).toBeEnabled();
    await userEvent.click(saveButton);
    await expect(args.onSaveVocabularySuggestion).toHaveBeenCalledTimes(1);
  },
};

export const NarrowTapOpen: Story = {
  args: {
    getVocabularySuggestionState: () => "idle",
    onSaveVocabularySuggestion: () => undefined,
    result: analysisMock,
  },
  render: (args) => (
    <div className="storybook-analysis-narrow">
      <AnalysisResult {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const setupToken = canvas.getByRole("button", {
      name: "setup 뜻과 저장 액션 보기",
    });

    await userEvent.pointer({ keys: "[TouchA]", target: setupToken });

    const documentCanvas = within(canvasElement.ownerDocument.body);
    await expect(
      documentCanvas.getByRole("group", {
        name: "setup 뜻과 저장 액션",
      }),
    ).toBeVisible();
  },
};
