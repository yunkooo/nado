import type { Meta, StoryObj } from "@storybook/react-vite";
import { ReviewSessionView } from "@nado/ui-web";

const meta = {
  component: ReviewSessionView,
  title: "Review/ReviewSessionView",
} satisfies Meta<typeof ReviewSessionView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AnswerHidden: Story = {
  args: {
    card: { answer: "출시/배포", prompt: "shipping" },
    currentIndex: 0,
    direction: "english-to-korean",
    isAnswerRevealed: false,
    itemCount: 10,
    onChangeDirection: () => undefined,
    onMoveNext: () => undefined,
    onToggleAnswer: () => undefined,
  },
};

export const AnswerRevealed: Story = {
  args: {
    ...AnswerHidden.args,
    isAnswerRevealed: true,
  },
};
