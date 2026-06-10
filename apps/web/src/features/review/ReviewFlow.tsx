"use client";

import { useAuthState } from "../auth/authState";
import { getVocabularyPanelState } from "../vocabulary/vocabularyViewState";
import { useVocabularyState } from "../vocabulary/vocabularyState";
import { ReviewPanel } from "./ReviewPanels";
import { ReviewSessionView } from "./ReviewSessionView";
import { useReviewSession } from "./useReviewSession";

type ReviewStatus = "loading" | "ready";

export function ReviewFlow() {
  const authState = useAuthState();
  const vocabularyState = useVocabularyState();
  const session = useReviewSession(authState, vocabularyState);
  const status: ReviewStatus =
    authState.status === "loading" || vocabularyState.status === "loading"
      ? "loading"
      : "ready";
  const isLoading = status === "loading";
  const panelState = getVocabularyPanelState({
    authStatus: authState.status,
    isLoading,
    itemCount: vocabularyState.items.length,
    message: vocabularyState.message,
  });

  if (panelState !== "list") {
    return <ReviewPanel message={vocabularyState.message} state={panelState} />;
  }

  if (!session.card || !session.currentItem) {
    return <ReviewPanel message={vocabularyState.message} state="empty" />;
  }

  return (
    <ReviewSessionView
      card={session.card}
      currentIndex={session.currentIndex}
      direction={session.direction}
      isAnswerRevealed={session.isAnswerRevealed}
      itemCount={session.itemCount}
      onChangeDirection={session.changeDirection}
      onMoveNext={session.moveNext}
      onToggleAnswer={session.toggleAnswer}
    />
  );
}
