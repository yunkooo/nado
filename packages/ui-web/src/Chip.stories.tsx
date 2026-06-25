import type { Meta, StoryObj } from "@storybook/react-vite";
import { Chip } from "@nado/ui-web";

const meta = {
  component: Chip,
  title: "UI/Chip",
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    label: "framework",
    prefix: "저장",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    label: "setup",
    prefix: "구성",
  },
};

export const Wrapped: Story = {
  args: {
    label: "framework",
  },
  render: () => (
    <div className="storybook-chip-row">
      <Chip label="framework" prefix="프레임워크" />
      <Chip label="shipping" prefix="출시/배포" />
      <Chip label="setup" prefix="구성" />
      <Chip label="acceptable" prefix="감수 가능한" />
      <Chip label="lighter process" prefix="더 가벼운 절차" />
      <Chip label="maintain" prefix="유지보수하다" />
    </div>
  ),
};
