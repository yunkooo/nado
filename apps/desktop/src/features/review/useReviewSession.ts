import { useEffect, useMemo, useState } from "react";
import {
  createReviewCardKey,
  getCurrentReviewIndex,
  getNextReviewIndex,
  getReviewCard,
  getReviewableItems,
  type ReviewDirection,
} from "@nado/shared/review";
import type { AuthStateSnapshot } from "../../auth/authState";
import type { VocabularyStateSnapshot } from "../vocabulary/vocabularyState";

export function useReviewSession(
  authState: AuthStateSnapshot,
  vocabularyState: VocabularyStateSnapshot,
) {
  const [direction, setDirection] =
    useState<ReviewDirection>("english-to-korean");
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  const [revealedCardKey, setRevealedCardKey] = useState<string | null>(null);
  const items = useMemo(
    () => getReviewableItems(vocabularyState.items),
    [vocabularyState.items],
  );
  const currentIndex = getCurrentReviewIndex(items, currentItemId);
  const currentItem = items[currentIndex];
  const card = currentItem ? getReviewCard(currentItem, direction) : null;
  const currentCardKey = currentItem
    ? createReviewCardKey(currentItem, direction)
    : null;
  const isAnswerRevealed =
    currentCardKey !== null && revealedCardKey === currentCardKey;

  useEffect(() => {
    setCurrentItemId((itemId) => {
      if (itemId && items.some((item) => item.id === itemId)) {
        return itemId;
      }

      return items[0]?.id ?? null;
    });
  }, [items]);

  useEffect(() => {
    if (authState.status !== "authenticated") {
      setCurrentItemId(null);
      setRevealedCardKey(null);
    }
  }, [authState.status]);

  const changeDirection = (nextDirection: ReviewDirection) => {
    setDirection(nextDirection);
    setRevealedCardKey(null);
  };

  const moveNext = () => {
    const nextIndex = getNextReviewIndex(currentIndex, items.length);
    setCurrentItemId(items[nextIndex]?.id ?? null);
    setRevealedCardKey(null);
  };

  return {
    card,
    changeDirection,
    currentIndex,
    currentItem,
    direction,
    isAnswerRevealed,
    itemCount: items.length,
    moveNext,
    toggleAnswer: () => {
      if (!currentCardKey) {
        return;
      }

      setRevealedCardKey((cardKey) =>
        cardKey === currentCardKey ? null : currentCardKey,
      );
    },
  };
}
