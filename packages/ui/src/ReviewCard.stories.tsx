import type { Meta, StoryObj } from "@storybook/react-vite";
import { ReviewCard } from "@nado/ui";

const meta = {
  component: ReviewCard,
  title: "Review/ReviewCard",
} satisfies Meta<typeof ReviewCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AnswerHidden: Story = {
  args: {
    answer: "출시/배포",
    example: "The team improved shipping speed.",
    isRevealed: false,
    prompt: "shipping",
  },
  render: (args) => (
    <div className="storybook-vocabulary-surface">
      <ReviewCard {...args} />
    </div>
  ),
};

export const Revealed: Story = {
  args: {
    answer: "출시/배포",
    example: "The team improved shipping speed.",
    isRevealed: true,
    prompt: "shipping",
  },
  render: (args) => (
    <div className="storybook-vocabulary-surface">
      <ReviewCard {...args} />
    </div>
  ),
};
