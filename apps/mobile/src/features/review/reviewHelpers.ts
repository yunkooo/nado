import type { VocabularyItem } from "@nado/shared";

export type ReviewDirection = "english-to-korean" | "korean-to-english";

export const mobileReviewDirectionOptions = [
  { key: "english-to-korean", label: "영어 → 한국어" },
  { key: "korean-to-english", label: "한국어 → 영어" },
] as const;

export function getNextReviewIndex(currentIndex: number, itemCount: number) {
  if (itemCount <= 0) {
    return 0;
  }

  return (currentIndex + 1) % itemCount;
}

export function getReviewCard(
  item: VocabularyItem,
  direction: ReviewDirection,
) {
  const primaryMeaning = item.meanings[0];
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
