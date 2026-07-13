import type { Meta, StoryObj } from "@storybook/react-vite";
import { createVocabularyMeaningMutationKey } from "@nado/shared/vocabulary";
import { VocabularyItemCard } from "@nado/ui-web";

const item = {
  createdAt: "2026-07-10T00:00:00.000Z",
  id: "storybook-vocabulary-1",
  meanings: [
    {
      createdAt: "2026-07-10T00:00:00.000Z",
      meaning: "상태",
    },
    {
      createdAt: "2026-07-10T00:01:00.000Z",
      meaning: "지역, 주",
      note: "미국 등의 행정 구역을 나타낼 때 사용합니다.",
    },
  ],
  term: "state",
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
        deletingMeaningKeys={new Set()}
        item={item}
        onDeleteMeaning={() => undefined}
      />
    </div>
  ),
};

export const Deleting: Story = {
  render: () => (
    <div className="storybook-vocabulary-surface">
      <VocabularyItemCard
        deletingMeaningKeys={
          new Set([
            createVocabularyMeaningMutationKey(item.id, item.meanings[0]!),
          ])
        }
        item={item}
        onDeleteMeaning={() => undefined}
      />
    </div>
  ),
};
