import { useAuthState } from "../../auth/authState";
import { getVocabularyPanelState } from "../vocabulary/vocabularyViewState";
import { useVocabularyState } from "../vocabulary/vocabularyState";
import { ReviewPanel } from "./ReviewPanels";
import { ReviewSessionView } from "./ReviewSessionView";
import { useReviewSession } from "./useReviewSession";

export function ReviewFlow() {
  const authState = useAuthState();
  const vocabularyState = useVocabularyState();
  const session = useReviewSession(authState, vocabularyState);
  const panelState = getVocabularyPanelState({
    authStatus: authState.status,
    itemCount: vocabularyState.items.length,
    message: vocabularyState.message,
    vocabularyStatus: vocabularyState.status,
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
