import type { MobileVocabularySuggestion } from "../../api/analysisApi";
import type { VocabularyMeaning } from "@nado/shared/vocabulary";
import type { MobileAuthStateSnapshot } from "../../auth/authState";
import type { MobileVocabularyState } from "./mobileVocabularyState";
import { useMobileVocabularyLoader } from "./useMobileVocabularyLoader";
import { useMobileVocabularyManualRefresh } from "./useMobileVocabularyManualRefresh";
import { useMobileVocabularyMutations } from "./useMobileVocabularyMutations";

export type { MobileVocabularyState } from "./mobileVocabularyState";

export type MobileVocabularyActions = {
  clearSaveMessage(): void;
  deleteMeaning(itemId: string, meaning: VocabularyMeaning): Promise<void>;
  deletingMeaningKeys: ReadonlySet<string>;
  getSuggestionState(
    suggestion: MobileVocabularySuggestion,
  ): "idle" | "saved" | "saving";
  isRefreshing: boolean;
  refreshVocabulary(): Promise<void>;
  saveMessage: string | null;
  saveSuggestion(suggestion: MobileVocabularySuggestion): Promise<void>;
};

export function useMobileVocabulary(
  authState: MobileAuthStateSnapshot,
  isStudySurfaceActive = false,
  refreshKey: unknown = isStudySurfaceActive,
): [MobileVocabularyState, MobileVocabularyActions] {
  const loader = useMobileVocabularyLoader({
    authState,
    isStudySurfaceActive,
    refreshKey,
  });
  const manualRefresh = useMobileVocabularyManualRefresh({
    authState,
    refreshVocabularyInBackground: loader.refreshVocabularyInBackground,
  });
  const mutations = useMobileVocabularyMutations({
    authState,
    readyRevision: loader.readyRevision,
    refreshVocabularyInBackground: loader.refreshVocabularyInBackground,
    updateVocabularyState: loader.updateVocabularyState,
    vocabularyState: loader.vocabularyState,
  });

  return [
    loader.vocabularyState,
    {
      clearSaveMessage: mutations.clearSaveMessage,
      deleteMeaning: mutations.deleteMeaning,
      deletingMeaningKeys: mutations.deletingMeaningKeys,
      getSuggestionState: mutations.getSuggestionState,
      isRefreshing: manualRefresh.isRefreshing,
      refreshVocabulary: manualRefresh.refreshVocabulary,
      saveMessage: mutations.saveMessage,
      saveSuggestion: mutations.saveSuggestion,
    },
  ];
}
