import type { VocabularyItem } from "./vocabularyContracts.ts";

export type ReviewDirection = "english-to-korean" | "korean-to-english";

export type ReviewDirectionOption = {
  key: ReviewDirection;
  label: string;
};

export type ReviewCard = {
  answer: string;
  prompt: string;
};

type ReviewableMeaning = {
  meaning: string;
  note?: string;
};

export const reviewDirectionOptions: ReviewDirectionOption[] = [
  { key: "english-to-korean", label: "영어 → 한국어" },
  { key: "korean-to-english", label: "한국어 → 영어" },
];

export function getNextReviewIndex(currentIndex: number, itemCount: number) {
  if (itemCount <= 0) {
    return 0;
  }

  return (currentIndex + 1) % itemCount;
}

export function getCurrentReviewIndex(
  items: VocabularyItem[],
  currentItemId: string | null,
) {
  if (!currentItemId) {
    return 0;
  }

  const currentIndex = items.findIndex((item) => item.id === currentItemId);
  return currentIndex >= 0 ? currentIndex : 0;
}

export function createReviewCardKey(
  item: VocabularyItem,
  direction: ReviewDirection,
) {
  return `${item.id}:${item.updatedAt}:${direction}`;
}

export function getReviewCard(
  item: VocabularyItem,
  direction: ReviewDirection,
): ReviewCard {
  const primaryMeaning = getPrimaryReviewMeaning(item);
  const meaning = primaryMeaning?.meaning.trim() ?? "";

  if (direction === "korean-to-english") {
    return {
      answer: item.term,
      prompt: meaning,
    };
  }

  return {
    answer: meaning,
    prompt: item.term,
  };
}

export function getReviewableItems(items: VocabularyItem[]) {
  return items.filter((item) => getPrimaryReviewMeaning(item));
}

function getPrimaryReviewMeaning(
  item: VocabularyItem,
): ReviewableMeaning | undefined {
  return item.meanings.find((meaning) => meaning.meaning.trim().length > 0);
}
