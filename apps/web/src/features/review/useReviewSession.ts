"use client";

import { useMemo, useState } from "react";
import {
  createReviewCardKey,
  getCurrentReviewIndex,
  getNextReviewIndex,
  getReviewCard,
  getReviewableItems,
  type ReviewDirection,
} from "@nado/shared/review";
import type { AuthStateSnapshot } from "../auth/authState";
import type { VocabularyStateSnapshot } from "../vocabulary/vocabularyState";

export function useReviewSession(
  authState: AuthStateSnapshot,
  vocabularyState: VocabularyStateSnapshot,
) {
  const [direction, setDirection] =
    useState<ReviewDirection>("english-to-korean");
  const [sessionState, setSessionState] = useState({
    currentItemId: null as string | null,
    ownerAccessToken: null as string | null,
    revealedCardKey: null as string | null,
  });
  const items = useMemo(
    () => getReviewableItems(vocabularyState.items),
    [vocabularyState.items],
  );
  const isSessionScopeCurrent =
    authState.status === "authenticated" &&
    sessionState.ownerAccessToken === authState.accessToken;
  const currentItemId = isSessionScopeCurrent
    ? sessionState.currentItemId
    : null;
  const revealedCardKey = isSessionScopeCurrent
    ? sessionState.revealedCardKey
    : null;
  const currentIndex = getCurrentReviewIndex(items, currentItemId);
  const currentItem = items[currentIndex];
  const card = currentItem ? getReviewCard(currentItem, direction) : null;
  const currentCardKey = currentItem
    ? createReviewCardKey(currentItem, direction)
    : null;
  const isAnswerRevealed =
    currentCardKey !== null && revealedCardKey === currentCardKey;

  const changeDirection = (nextDirection: ReviewDirection) => {
    setDirection(nextDirection);
    setSessionState({
      currentItemId: currentItem?.id ?? null,
      ownerAccessToken: authState.accessToken,
      revealedCardKey: null,
    });
  };

  const moveNext = () => {
    const nextIndex = getNextReviewIndex(currentIndex, items.length);
    setSessionState({
      currentItemId: items[nextIndex]?.id ?? null,
      ownerAccessToken: authState.accessToken,
      revealedCardKey: null,
    });
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

      setSessionState({
        currentItemId: currentItem?.id ?? null,
        ownerAccessToken: authState.accessToken,
        revealedCardKey:
          revealedCardKey === currentCardKey ? null : currentCardKey,
      });
    },
  };
}
