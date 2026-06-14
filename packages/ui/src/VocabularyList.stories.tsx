import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  VocabularyEmptyState,
  VocabularyErrorState,
  VocabularyListItem,
} from "@nado/ui";
import { analysisMock } from "./analysisStoryFixtures";

const firstItem =
  analysisMock.vocabularyItems[2] ?? analysisMock.vocabularyItems[0];

const meta = {
  title: "Vocabulary/List",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Item: Story = {
  render: () => (
    <div className="storybook-vocabulary-surface">
      <VocabularyListItem
        context={
          firstItem?.contextMeaning ?? "문장 안에서 쓰인 뜻을 보여줍니다."
        }
        meaning={firstItem?.meaning ?? "뜻"}
        meta={firstItem?.partOfSpeech ?? "표현"}
        term={firstItem?.term ?? "term"}
      />
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div className="storybook-vocabulary-surface">
      <VocabularyEmptyState
        description="분석 결과에서 저장한 단어와 표현이 여기에 쌓입니다."
        title="저장한 단어가 없습니다"
      />
    </div>
  ),
};

export const Error: Story = {
  render: () => (
    <div className="storybook-vocabulary-surface">
      <VocabularyErrorState
        description="네트워크 상태를 확인한 뒤 다시 시도하세요."
        title="단어장을 불러오지 못했습니다"
      />
    </div>
  ),
};
