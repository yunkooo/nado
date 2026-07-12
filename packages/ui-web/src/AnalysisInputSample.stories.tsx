import type { Meta, StoryObj } from "@storybook/react-vite";
import { MAX_ANALYSIS_TEXT_LENGTH } from "@nado/shared/analysis-input";
import { InputSample } from "@nado/ui-web";

const longInputSampleText =
  "Many developers choose a framework because it promises faster shipping, but the real test appears after the product grows. A simple setup can help a small team move quickly, while unclear rules can make every change harder to review. Before adding tools, the team should understand which problems are frequent, which costs are ";

const meta = {
  component: InputSample,
  title: "Analysis/InputSample",
} satisfies Meta<typeof InputSample>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    maxLength: MAX_ANALYSIS_TEXT_LENGTH,
    text: longInputSampleText,
  },
};
