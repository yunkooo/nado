import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge, Stack } from "@nado/ui-web";

const meta = {
  component: Badge,
  title: "UI/Badge",
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = {
  args: {
    children: "noun",
  },
};

export const Tones: Story = {
  args: {
    children: null,
  },
  render: () => (
    <Stack direction="horizontal" gap="sm">
      <Badge tone="neutral">Neutral</Badge>
      <Badge tone="primary">Primary</Badge>
      <Badge tone="success">Success</Badge>
      <Badge tone="warning">Warning</Badge>
      <Badge tone="danger">Danger</Badge>
    </Stack>
  ),
};

export const Sizes: Story = {
  args: {
    children: null,
  },
  render: () => (
    <Stack align="center" direction="horizontal" gap="sm">
      <Badge size="sm">small</Badge>
      <Badge size="md">medium</Badge>
    </Stack>
  ),
};
