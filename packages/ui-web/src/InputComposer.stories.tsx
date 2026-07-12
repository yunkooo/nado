import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import {
  ANALYSIS_MODELS,
  DEFAULT_ANALYSIS_MODEL_ID,
  MAX_ANALYSIS_TEXT_LENGTH,
} from "@nado/shared/analysis-input";
import { InputComposer, type InputComposerProps } from "@nado/ui-web";

const meta = {
  component: InputComposer,
  title: "UI/InputComposer",
} satisfies Meta<typeof InputComposer>;

export default meta;
type Story = StoryObj<typeof meta>;

interface ComposerPreviewProps extends Omit<
  InputComposerProps,
  "onValueChange" | "value"
> {
  initialValue: string;
}

function ComposerPreview({ initialValue, ...props }: ComposerPreviewProps) {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="storybook-surface">
      <InputComposer {...props} onValueChange={setValue} value={value} />
    </div>
  );
}

export const Empty: Story = {
  args: {
    actionLabel: "↑",
    maxLength: MAX_ANALYSIS_TEXT_LENGTH,
    modelOptions: ANALYSIS_MODELS,
    modelValue: DEFAULT_ANALYSIS_MODEL_ID,
    onSubmit: () => undefined,
    onModelChange: () => undefined,
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
    maxLength: MAX_ANALYSIS_TEXT_LENGTH,
    onSubmit: fn(),
    onValueChange: () => undefined,
    value: "",
  },
  render: (args) => (
    <ComposerPreview
      initialValue="I was wondering if you could help me keep this habit."
      maxLength={MAX_ANALYSIS_TEXT_LENGTH}
      modelOptions={ANALYSIS_MODELS}
      modelValue={DEFAULT_ANALYSIS_MODEL_ID}
      onModelChange={() => undefined}
      onSubmit={args.onSubmit ?? (() => undefined)}
      placeholder="영어 문장이나 짧은 문단을 붙여넣으세요"
      submitAriaLabel="분석 요청"
    />
  ),
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const submitButton = canvas.getByRole("button", { name: "분석 요청" });

    await expect(submitButton).toBeEnabled();
    await userEvent.click(submitButton);
    await expect(args.onSubmit).toHaveBeenCalledTimes(1);
  },
};

export const TextAction: Story = {
  args: {
    maxLength: MAX_ANALYSIS_TEXT_LENGTH,
    onSubmit: () => undefined,
    onValueChange: () => undefined,
    value: "",
  },
  render: () => (
    <ComposerPreview
      actionLabel="분석"
      initialValue="I need help understanding this sentence."
      maxLength={MAX_ANALYSIS_TEXT_LENGTH}
      modelOptions={ANALYSIS_MODELS}
      modelValue={DEFAULT_ANALYSIS_MODEL_ID}
      onModelChange={() => undefined}
      onSubmit={() => undefined}
      placeholder="영어 문장이나 짧은 문단을 붙여넣으세요"
      submitAriaLabel="분석 요청"
    />
  ),
};

export const NearLimit: Story = {
  args: {
    maxLength: MAX_ANALYSIS_TEXT_LENGTH,
    onSubmit: () => undefined,
    onValueChange: () => undefined,
    value: "",
  },
  render: () => (
    <ComposerPreview
      initialValue={`${"The team should understand which problems are frequent, which costs are acceptable, and when a lighter process is enough. ".repeat(2)}This habit keeps the codebase easier to maintain.`.slice(
        0,
        MAX_ANALYSIS_TEXT_LENGTH - 12,
      )}
      maxLength={MAX_ANALYSIS_TEXT_LENGTH}
      modelOptions={ANALYSIS_MODELS}
      modelValue={DEFAULT_ANALYSIS_MODEL_ID}
      onModelChange={() => undefined}
      onSubmit={() => undefined}
      placeholder="영어 문장이나 짧은 문단을 붙여넣으세요"
      submitAriaLabel="분석 요청"
    />
  ),
};

export const LongInput: Story = {
  args: {
    maxLength: MAX_ANALYSIS_TEXT_LENGTH,
    onSubmit: () => undefined,
    onValueChange: () => undefined,
    value: "",
  },
  render: () => (
    <ComposerPreview
      initialValue={"Many developers choose a framework because it promises faster shipping, but the real test appears after the product grows. ".repeat(
        6,
      )}
      maxLength={MAX_ANALYSIS_TEXT_LENGTH}
      modelOptions={ANALYSIS_MODELS}
      modelValue={DEFAULT_ANALYSIS_MODEL_ID}
      onModelChange={() => undefined}
      onSubmit={() => undefined}
      placeholder="영어 문장이나 짧은 문단을 붙여넣으세요"
      submitAriaLabel="분석 요청"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const submitButton = canvas.getByRole("button", { name: "분석 요청" });

    await expect(canvas.getByText(/\/ 200$/)).toBeVisible();
    await expect(submitButton).toBeDisabled();
  },
};
