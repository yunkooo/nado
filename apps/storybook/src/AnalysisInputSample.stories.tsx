import type { Meta, StoryObj } from "@storybook/react-vite";
import { MAX_ANALYSIS_TEXT_LENGTH } from "@nado/shared";
import { InputSample } from "@nado/ui";
import { analysisMock } from "./analysisMock";

const meta = {
  component: InputSample,
  title: "Analysis/InputSample",
} satisfies Meta<typeof InputSample>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    count: 487,
    maxLength: MAX_ANALYSIS_TEXT_LENGTH,
    text: analysisMock.sourceText,
  },
};
