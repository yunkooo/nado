import type { Meta, StoryObj } from "@storybook/react-vite";
import { SentenceAnalysis } from "@nado/ui-web";
import { analysisMock } from "./analysisStoryFixtures";

const firstSentence = analysisMock.sentences[0];
const longSentence = analysisMock.sentences[2];

if (!firstSentence || !longSentence) {
  throw new Error("Analysis sentence story data is incomplete.");
}

const meta = {
  component: SentenceAnalysis,
  title: "Analysis/SentenceAnalysis",
} satisfies Meta<typeof SentenceAnalysis>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    sentence: firstSentence,
  },
};

export const LongSentence: Story = {
  args: {
    sentence: longSentence,
  },
};
