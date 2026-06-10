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

export function getReviewCard(
  item: VocabularyItem,
  direction: ReviewDirection,
): ReviewCard {
  const primaryMeaning = getPrimaryReviewMeaning(item);
  const meaning = primaryMeaning?.meaning.trim() ?? "";
  const note = primaryMeaning?.note?.trim() ?? "";

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

export function getReviewableItems(items: VocabularyItem[]) {
  return items.filter((item) => getPrimaryReviewMeaning(item));
}

function getPrimaryReviewMeaning(
  item: VocabularyItem,
): ReviewableMeaning | undefined {
  return item.meanings.find((meaning) => meaning.meaning.trim().length > 0);
}
