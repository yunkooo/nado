import type { VocabularyItem } from "@nado/shared";

export type ReviewDirection = "english-to-korean" | "korean-to-english";

export type ReviewDirectionOption = {
  key: ReviewDirection;
  label: string;
};

export type ReviewCard = {
  answer: string;
  note: string;
  prompt: string;
};

export const reviewDirectionOptions: ReviewDirectionOption[] = [
  { key: "english-to-korean", label: "영어 → 한국어" },
  { key: "korean-to-english", label: "한국어 → 영어" },
];

export const mockVocabularyItems: VocabularyItem[] = [
  {
    createdAt: "2026-06-09T00:00:00.000Z",
    id: "mock-wondering",
    meanings: [
      {
        createdAt: "2026-06-09T00:00:00.000Z",
        meaning: "궁금해하다",
        note: "정중하게 질문을 꺼내는 표현",
      },
      {
        createdAt: "2026-06-09T00:00:00.000Z",
        meaning: "~인지 알고 싶다",
        note: "if 절과 함께 부드럽게 요청할 때 자주 쓰입니다.",
      },
    ],
    term: "wondering",
    type: "word",
    updatedAt: "2026-06-09T00:00:00.000Z",
  },
  {
    createdAt: "2026-06-09T00:00:00.000Z",
    id: "mock-take-a-look",
    meanings: [
      {
        createdAt: "2026-06-09T00:00:00.000Z",
        meaning: "한번 살펴보다",
        note: "문제나 자료를 가볍게 확인해 달라고 요청할 때 씁니다.",
      },
    ],
    term: "take a look",
    type: "phrase",
    updatedAt: "2026-06-09T00:00:00.000Z",
  },
  {
    createdAt: "2026-06-09T00:00:00.000Z",
    id: "mock-issue",
    meanings: [
      {
        createdAt: "2026-06-09T00:00:00.000Z",
        meaning: "문제, 쟁점",
        note: "bug보다 넓은 의미로 상황이나 논의할 점을 가리킵니다.",
      },
    ],
    term: "issue",
    type: "word",
    updatedAt: "2026-06-09T00:00:00.000Z",
  },
];

export function getMockVocabularySummary(items: VocabularyItem[]) {
  return {
    label: "저장 항목",
    value: String(items.length),
  };
}

export function deleteMockVocabularyItem(
  items: VocabularyItem[],
  itemId: string,
) {
  return items.filter((item) => item.id !== itemId);
}

export function getNextReviewIndex(currentIndex: number, itemCount: number) {
  if (itemCount <= 0) {
    return 0;
  }

  return (currentIndex + 1) % itemCount;
}

export function getReviewCard(
  item: VocabularyItem,
  direction: ReviewDirection,
): ReviewCard {
  const primaryMeaning = item.meanings[0];
  const meaning = primaryMeaning?.meaning ?? "";
  const note = primaryMeaning?.note ?? "";

  if (direction === "korean-to-english") {
    return {
      answer: item.term,
      note,
      prompt: meaning,
    };
  }

  return {
    answer: meaning,
    note,
    prompt: item.term,
  };
}
