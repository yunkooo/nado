import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { VocabularySuggestionList } from "@nado/ui-web";
import { analysisMock } from "./analysisStoryFixtures";

const meta = {
  component: VocabularySuggestionList,
  title: "Analysis/VocabularySuggestionList",
} satisfies Meta<typeof VocabularySuggestionList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  args: {
    getSuggestionState: () => "idle",
    onSaveSuggestion: () => undefined,
    suggestions: analysisMock.vocabularySuggestions,
  },
  render: (args) => (
    <div className="storybook-chip-row">
      <VocabularySuggestionList {...args} />
    </div>
  ),
};

export const Saving: Story = {
  args: {
    getSuggestionState: () => "saving",
    onSaveSuggestion: () => undefined,
    suggestions: analysisMock.vocabularySuggestions.slice(0, 3),
  },
  render: (args) => (
    <div className="storybook-chip-row">
      <VocabularySuggestionList {...args} />
    </div>
  ),
};

export const SavedDisabled: Story = {
  args: {
    getSuggestionState: () => "saved",
    onSaveSuggestion: () => undefined,
    suggestions: analysisMock.vocabularySuggestions.slice(0, 3),
  },
  render: (args) => (
    <div className="storybook-chip-row">
      <VocabularySuggestionList {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const savedButtons = canvas.getAllByRole("button");

    await expect(savedButtons).toHaveLength(3);
    for (const button of savedButtons) {
      await expect(button).toBeDisabled();
    }
  },
};
