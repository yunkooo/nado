"use client";

import { VocabularyRefreshButton } from "@nado/ui";
import { useAuthState } from "../auth/authState";
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
