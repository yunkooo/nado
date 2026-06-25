import type { Meta, StoryObj } from "@storybook/react-vite";
import { Text } from "@nado/ui";

const meta = {
  component: Text,
  title: "UI/Text",
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    children: "The real test appears after the product grows.",
  },
};

export const Muted: Story = {
  args: {
    children: "Token names stay shared even when platform rendering differs.",
    tone: "muted",
  },
};

export const Emphasis: Story = {
  args: {
    children: "A smaller contract is easier to keep consistent.",
    size: "lg",
    tone: "primary",
    weight: "bold",
  },
};

export const Centered: Story = {
  args: {
    align: "center",
    children: "Reviewable increments keep the design system honest.",
    tone: "danger",
    weight: "medium",
  },
};
