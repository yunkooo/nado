"use client";

import { useEffect, useState } from "react";
import type { AuthStateSnapshot } from "../auth/authState";
import type { VocabularyStateSnapshot } from "../vocabulary/vocabularyState";
import {
  getNextReviewIndex,
  getReviewCard,
  getReviewableItems,
  type ReviewDirection,
} from "./reviewSession";

export function useReviewSession(
  authState: AuthStateSnapshot,
  vocabularyState: VocabularyStateSnapshot,
) {
  const [direction, setDirection] =
    useState<ReviewDirection>("english-to-korean");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const items = getReviewableItems(vocabularyState.items);
  const currentItem = items[currentIndex];
  const card = currentItem ? getReviewCard(currentItem, direction) : null;

  useEffect(() => {
    setCurrentIndex((index) =>
      items.length === 0 ? 0 : Math.min(index, items.length - 1),
    );
    setIsAnswerRevealed(false);
  }, [items.length]);

  useEffect(() => {
    if (authState.status !== "authenticated") {
      setCurrentIndex(0);
      setIsAnswerRevealed(false);
    }
  }, [authState.status]);

  const changeDirection = (nextDirection: ReviewDirection) => {
    setDirection(nextDirection);
    setIsAnswerRevealed(false);
  };

  const moveNext = () => {
    setCurrentIndex((index) => getNextReviewIndex(index, items.length));
    setIsAnswerRevealed(false);
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
    toggleAnswer: () => setIsAnswerRevealed((isRevealed) => !isRevealed),
  };
}
