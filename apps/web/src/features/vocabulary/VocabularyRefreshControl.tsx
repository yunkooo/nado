"use client";

import { useAuthState } from "../auth/authState";
import { VocabularyRefreshButton } from "./VocabularyRefreshButton";
import { useVocabularyManualRefresh } from "./useVocabularyManualRefresh";

export function VocabularyRefreshControl() {
  const authState = useAuthState();
  const vocabularyRefresh = useVocabularyManualRefresh(authState);

  return (
    <VocabularyRefreshButton
      isDisabled={vocabularyRefresh.isDisabled}
      isRefreshing={vocabularyRefresh.isRefreshing}
      message={vocabularyRefresh.message}
      onRefresh={vocabularyRefresh.refreshVocabulary}
    />
  );
}
