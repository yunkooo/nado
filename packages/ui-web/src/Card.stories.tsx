import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card, Stack, Text } from "@nado/ui-web";

const meta = {
  component: Card,
  title: "UI/Card",
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Surface: Story = {
  args: {
    children: null,
    padding: "lg",
  },
  render: (args) => (
    <Card {...args}>
      <Stack gap="sm">
        <Text size="lg" weight="bold">
          Review summary
        </Text>
        <Text tone="muted">
          Card frames repeated content without becoming a page section wrapper.
        </Text>
      </Stack>
    </Card>
  ),
};

export const Muted: Story = {
  args: {
    children: null,
    padding: "md",
    tone: "muted",
  },
  render: (args) => (
    <Card {...args}>
      <Text tone="muted">
        Secondary context can use the muted surface tone.
      </Text>
    </Card>
  ),
};

export const ElevatedComposerRadius: Story = {
  args: {
    children: null,
    padding: "xl",
    radius: "composer",
    tone: "elevated",
  },
  render: (args) => (
    <Card {...args}>
      <Stack gap="md">
        <Text weight="bold">Composer-like surface</Text>
        <Text tone="muted">
          Elevated cards keep the same public API while using platform CSS.
        </Text>
      </Stack>
    </Card>
  ),
};
