import type { Meta, StoryObj } from "@storybook/react-vite";
import { VocabularyItemCard } from "@nado/ui-web";

const item = {
  createdAt: "2026-07-10T00:00:00.000Z",
  id: "storybook-vocabulary-1",
  meanings: [
    {
      meaning: "출시/배포",
      note: "제품을 사용자에게 전달하거나 공개하는 일을 말합니다.",
    },
  ],
  term: "shipping",
  type: "word" as const,
  updatedAt: "2026-07-11T00:00:00.000Z",
};

const meta = {
  title: "Vocabulary/List",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Item: Story = {
  render: () => (
    <div className="storybook-vocabulary-surface">
      <VocabularyItemCard
        isDeleting={false}
        item={item}
        onDelete={() => undefined}
      />
    </div>
  ),
};

export const Deleting: Story = {
  render: () => (
    <div className="storybook-vocabulary-surface">
      <VocabularyItemCard isDeleting item={item} onDelete={() => undefined} />
    </div>
  ),
};
