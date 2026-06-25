import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, Stack, Text } from "@nado/ui";

const meta = {
  component: Stack,
  title: "UI/Stack",
} satisfies Meta<typeof Stack>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Vertical: Story = {
  args: {
    children: null,
    gap: "md",
  },
  render: (args) => (
    <Stack {...args}>
      <Text size="lg" weight="bold">
        Design system step
      </Text>
      <Text tone="muted">
        Text and Stack share token names across platform implementations.
      </Text>
      <Button>Save</Button>
    </Stack>
  ),
};

export const Horizontal: Story = {
  args: {
    align: "center",
    children: null,
    direction: "horizontal",
    gap: "sm",
  },
  render: (args) => (
    <Stack {...args}>
      <Button size="sm">Accept</Button>
      <Button size="sm" variant="secondary">
        Later
      </Button>
      <Text size="sm" tone="muted">
        Shared spacing contract
      </Text>
    </Stack>
  ),
};
