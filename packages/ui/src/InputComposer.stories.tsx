import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { InputComposer, type InputComposerProps } from "@nado/ui";

const MAX_STORY_ANALYSIS_TEXT_LENGTH = 500;

const meta = {
  component: InputComposer,
  title: "UI/InputComposer",
} satisfies Meta<typeof InputComposer>;

export default meta;
type Story = StoryObj<typeof meta>;

interface ComposerPreviewProps extends Omit<
  InputComposerProps,
  "onSubmit" | "onValueChange" | "value"
> {
  initialValue: string;
}

function ComposerPreview({ initialValue, ...props }: ComposerPreviewProps) {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="storybook-surface">
      <InputComposer
        {...props}
        onSubmit={() => undefined}
        onValueChange={setValue}
        value={value}
      />
    </div>
  );
}

export const Empty: Story = {
  args: {
    actionLabel: "↑",
    label: "기본 분석",
    maxLength: MAX_STORY_ANALYSIS_TEXT_LENGTH,
    onSubmit: () => undefined,
    onValueChange: () => undefined,
    placeholder: "영어 문장이나 짧은 문단을 붙여넣으세요",
    submitAriaLabel: "분석 요청",
    value: "",
  },
  render: (args) => (
    <div className="storybook-surface">
      <InputComposer {...args} />
    </div>
  ),
};

export const Basic: Story = {
  args: {
    maxLength: MAX_STORY_ANALYSIS_TEXT_LENGTH,
    onSubmit: () => undefined,
    onValueChange: () => undefined,
    value: "",
  },
  render: () => (
    <ComposerPreview
      initialValue="I was wondering if you could help me keep this habit."
      maxLength={MAX_STORY_ANALYSIS_TEXT_LENGTH}
      placeholder="영어 문장이나 짧은 문단을 붙여넣으세요"
      submitAriaLabel="분석 요청"
    />
  ),
};

export const TextAction: Story = {
  args: {
    maxLength: MAX_STORY_ANALYSIS_TEXT_LENGTH,
    onSubmit: () => undefined,
    onValueChange: () => undefined,
    value: "",
  },
  render: () => (
    <ComposerPreview
      actionLabel="분석"
      initialValue="I need help understanding this sentence."
      maxLength={MAX_STORY_ANALYSIS_TEXT_LENGTH}
      placeholder="영어 문장이나 짧은 문단을 붙여넣으세요"
      submitAriaLabel="분석 요청"
    />
  ),
};

export const NearLimit: Story = {
  args: {
    maxLength: MAX_STORY_ANALYSIS_TEXT_LENGTH,
    onSubmit: () => undefined,
    onValueChange: () => undefined,
    value: "",
  },
  render: () => (
    <ComposerPreview
      initialValue={`${"The team should understand which problems are frequent, which costs are acceptable, and when a lighter process is enough. ".repeat(4)}This habit keeps the codebase easier to maintain.`.slice(
        0,
        487,
      )}
      maxLength={MAX_STORY_ANALYSIS_TEXT_LENGTH}
      placeholder="영어 문장이나 짧은 문단을 붙여넣으세요"
      submitAriaLabel="분석 요청"
    />
  ),
};

export const LongInput: Story = {
  args: {
    maxLength: MAX_STORY_ANALYSIS_TEXT_LENGTH,
    onSubmit: () => undefined,
    onValueChange: () => undefined,
    value: "",
  },
  render: () => (
    <ComposerPreview
      initialValue={"Many developers choose a framework because it promises faster shipping, but the real test appears after the product grows. ".repeat(
        6,
      )}
      maxLength={MAX_STORY_ANALYSIS_TEXT_LENGTH}
      placeholder="영어 문장이나 짧은 문단을 붙여넣으세요"
      submitAriaLabel="분석 요청"
    />
  ),
};
