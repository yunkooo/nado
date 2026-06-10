"use client";

import type {
  VocabularySuggestion,
  VocabularySuggestionSaveState,
} from "@nado/ui";
import type { AnalysisStateStore } from "./analysisState";
import { getCurrentAccessToken } from "../auth/authClient";
import { saveVocabularyItem } from "../vocabulary/vocabularyApi";
import {
  isVocabularySuggestionSaved,
  vocabularyStateStore,
  type VocabularyStateSnapshot,
} from "../vocabulary/vocabularyState";
import {
  createVocabularyLoginRequiredNotice,
  createVocabularySaveSuccessNotice,
} from "./vocabularySaveNotice";
import { createVocabularySuggestionKey } from "./vocabularySuggestionKey";

type UseVocabularySuggestionSaverOptions = {
  store: AnalysisStateStore;
  vocabularySaveStates: Record<string, VocabularySuggestionSaveState>;
  vocabularyState: VocabularyStateSnapshot;
};

export function useVocabularySuggestionSaver({
  store,
  vocabularySaveStates,
  vocabularyState,
}: UseVocabularySuggestionSaverOptions) {
  const getSuggestionState = (suggestion: VocabularySuggestion) => {
    const pendingState =
      vocabularySaveStates[createVocabularySuggestionKey(suggestion)];

    if (pendingState === "saving") {
      return "saving";
    }

    if (isVocabularySuggestionSaved(vocabularyState.items, suggestion)) {
      return "saved";
    }

    return "idle";
  };

  const saveSuggestion = async (suggestion: VocabularySuggestion) => {
    const key = createVocabularySuggestionKey(suggestion);

    if (getSuggestionState(suggestion) !== "idle") {
      return;
    }

    const accessToken = await getCurrentAccessToken();

    if (!accessToken) {
      store.setVocabularySaveMessage(createVocabularyLoginRequiredNotice());
      return;
    }

    store.setVocabularySaveMessage(null);
    store.setVocabularySaveStates((currentStates) => ({
      ...currentStates,
      [key]: "saving",
    }));

    const result = await saveVocabularyItem(
      {
        meaning: suggestion.meaning,
        note: suggestion.note,
        term: suggestion.term,
        type: suggestion.type,
      },
      accessToken,
    );

    store.setVocabularySaveStates((currentStates) => {
      const nextStates = { ...currentStates };
      delete nextStates[key];
      return nextStates;
    });

    if (result.status === "success") {
      vocabularyStateStore.upsertItem(result.data);
      store.setVocabularySaveMessage(createVocabularySaveSuccessNotice());
      return;
    }

    store.setVocabularySaveMessage({
      text: result.message,
      tone: "error",
    });
  };

  return {
    getSuggestionState,
    saveSuggestion,
  };
}
