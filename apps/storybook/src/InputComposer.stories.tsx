import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { MAX_ANALYSIS_TEXT_LENGTH } from "@nado/shared";
import { InputComposer } from "@nado/ui";

const meta = {
  component: InputComposer,
  title: "UI/InputComposer",
} satisfies Meta<typeof InputComposer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    maxLength: MAX_ANALYSIS_TEXT_LENGTH,
    onSubmit: () => undefined,
    onValueChange: () => undefined,
    value: "",
  },
  render: () => {
    const [value, setValue] = useState("I was wondering if you could help me.");

    return (
      <div className="storybook-surface">
        <InputComposer
          actionLabel="분석"
          maxLength={MAX_ANALYSIS_TEXT_LENGTH}
          onSubmit={() => undefined}
          onValueChange={setValue}
          placeholder="영어 문장을 입력하세요."
          value={value}
        />
      </div>
    );
  },
};
