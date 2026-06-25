import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@nado/ui-web";

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

export const Ghost: Story = {
  args: {
    children: "취소",
    variant: "ghost",
  },
};

export const SendIcon: Story = {
  args: {
    "aria-label": "분석 요청",
    children: "↑",
    size: "icon",
    variant: "send",
  },
};

export const Loading: Story = {
  args: {
    children: "분석",
    isLoading: true,
  },
};
