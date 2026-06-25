import type { Meta, StoryObj } from "@storybook/react-vite";
import { ReadingChunkLine } from "@nado/ui-web";
import { analysisMock } from "./analysisStoryFixtures";

const firstSentenceChunks = analysisMock.sentences[0]?.chunks ?? [];
const longSentenceChunks = analysisMock.sentences[2]?.chunks ?? [];

const meta = {
  component: ReadingChunkLine,
  title: "Analysis/ReadingChunkLine",
} satisfies Meta<typeof ReadingChunkLine>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    chunks: firstSentenceChunks,
  },
};

export const Narrow: Story = {
  args: {
    chunks: longSentenceChunks,
  },
  render: () => (
    <div className="storybook-narrow-surface">
      <ReadingChunkLine chunks={longSentenceChunks} />
    </div>
  ),
};
