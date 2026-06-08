import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@nado/ui";

const meta = {
  component: Button,
  title: "UI/Button",
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    children: "분석",
  },
};

export const Secondary: Story = {
  args: {
    children: "Google 로그인",
    variant: "secondary",
  },
};

export const Loading: Story = {
  args: {
    children: "분석",
    isLoading: true,
  },
};
