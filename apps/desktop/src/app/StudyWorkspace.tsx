import { Suspense, lazy } from "react";
import { useAuthState } from "../auth/authState";
import { VocabularyRefreshButton } from "../features/vocabulary/VocabularyRefreshButton";
import { useVocabularyManualRefresh } from "../features/vocabulary/useVocabularyManualRefresh";
import {
  useRefreshVocabularyForActiveStudySurface,
  useSyncVocabularyForAuth,
  useSyncVocabularyRealtimeForAuth,
} from "../features/vocabulary/vocabularyState";

type StudyWorkspaceProps = {
  activeItem: "review" | "vocabulary";
};

const ReviewFlow = lazy(() =>
  import("../features/review/ReviewFlow").then(({ ReviewFlow }) => ({
    default: ReviewFlow,
  })),
);
const VocabularyFlow = lazy(() =>
  import("../features/vocabulary/VocabularyFlow").then(
    ({ VocabularyFlow }) => ({
      default: VocabularyFlow,
    }),
  ),
);
const studyFlowFallback = (
  <div className="desktop-analysis-status" role="status">
    화면을 불러오는 중이에요.
  </div>
);

export function StudyWorkspace({ activeItem }: StudyWorkspaceProps) {
  const authState = useAuthState();
  const vocabularyRefresh = useVocabularyManualRefresh(authState);

  useSyncVocabularyForAuth(authState);
  useSyncVocabularyRealtimeForAuth(authState);
  useRefreshVocabularyForActiveStudySurface(authState, true, activeItem);

  const isVocabulary = activeItem === "vocabulary";
  const title = isVocabulary ? "단어장" : "복습";
  const eyebrow = isVocabulary ? "Vocabulary" : "Review";

  return (
    <section className="desktop-content-workspace">
      <div className="desktop-page">
        <header className="desktop-page-header">
          <div>
            <p className="nado-eyebrow">{eyebrow}</p>
            <h1 className="desktop-page-title">{title}</h1>
          </div>
          <VocabularyRefreshButton
            isDisabled={vocabularyRefresh.isDisabled}
            isRefreshing={vocabularyRefresh.isRefreshing}
            message={vocabularyRefresh.message}
            onRefresh={vocabularyRefresh.refreshVocabulary}
          />
        </header>
        <Suspense fallback={studyFlowFallback}>
          {isVocabulary ? <VocabularyFlow /> : <ReviewFlow />}
        </Suspense>
      </div>
    </section>
  );
}
