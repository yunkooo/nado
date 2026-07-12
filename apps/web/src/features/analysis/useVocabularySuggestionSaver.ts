"use client";

import { useEffect, useRef } from "react";
import { shouldApplyUserScopedMutation } from "@nado/shared/user-scope";
import {
  createVocabularySuggestionKey,
  isVocabularySuggestionSaved,
} from "@nado/shared/vocabulary";
import type {
  VocabularySuggestion,
  VocabularySuggestionSaveState,
} from "@nado/shared/analysis-presentation";
import type { AnalysisStateStore } from "./analysisState";
import { getCurrentAccessToken } from "../auth/authClient";
import { saveVocabularyItem } from "../vocabulary/vocabularyApi";
import {
  vocabularyStateStore,
  type VocabularyStateSnapshot,
} from "../vocabulary/vocabularyState";
import {
  createVocabularyLoginRequiredNotice,
  createVocabularySaveSuccessNotice,
} from "./vocabularySaveNotice";

type UseVocabularySuggestionSaverOptions = {
  store: AnalysisStateStore;
  userId: string | null;
  vocabularySaveStates: Record<string, VocabularySuggestionSaveState>;
  vocabularyState: VocabularyStateSnapshot;
};

export function useVocabularySuggestionSaver({
  store,
  userId,
  vocabularySaveStates,
  vocabularyState,
}: UseVocabularySuggestionSaverOptions) {
  const latestUserIdRef = useRef(userId);
  const pendingOwnerUserIdRef = useRef(userId);
  const pendingSuggestionKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    latestUserIdRef.current = userId;
    pendingOwnerUserIdRef.current = userId;
    pendingSuggestionKeysRef.current.clear();
  }, [userId]);

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

    const requestUserId = userId;

    if (!requestUserId) {
      store.setVocabularySaveMessage(createVocabularyLoginRequiredNotice());
      return;
    }

    if (pendingSuggestionKeysRef.current.has(key)) {
      return;
    }

    pendingSuggestionKeysRef.current.add(key);
    store.setVocabularySaveMessage(null);
    store.setVocabularySaveStates((currentStates) => ({
      ...currentStates,
      [key]: "saving",
    }));

    try {
      const accessToken = await getCurrentAccessToken();

      if (
        !shouldApplyUserScopedMutation(requestUserId, latestUserIdRef.current)
      ) {
        return;
      }

      if (!accessToken) {
        store.setVocabularySaveMessage(createVocabularyLoginRequiredNotice());
        return;
      }

      const result = await saveVocabularyItem(
        {
          meaning: suggestion.meaning,
          note: suggestion.note,
          term: suggestion.term,
          type: suggestion.type,
        },
        accessToken,
      );

      if (
        !shouldApplyUserScopedMutation(requestUserId, latestUserIdRef.current)
      ) {
        return;
      }

      if (result.status === "success") {
        vocabularyStateStore.upsertItem(result.data);
        store.setVocabularySaveMessage(createVocabularySaveSuccessNotice());
        return;
      }

      store.setVocabularySaveMessage({
        text: result.message,
        tone: "error",
      });
    } catch {
      if (
        shouldApplyUserScopedMutation(requestUserId, latestUserIdRef.current)
      ) {
        store.setVocabularySaveMessage({
          text: "단어장에 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
          tone: "error",
        });
      }
    } finally {
      releaseSuggestionSave(key, requestUserId);
    }
  };

  const releaseSuggestionSave = (key: string, requestUserId: string) => {
    if (
      pendingOwnerUserIdRef.current !== requestUserId ||
      !shouldApplyUserScopedMutation(requestUserId, latestUserIdRef.current)
    ) {
      return;
    }

    pendingSuggestionKeysRef.current.delete(key);
    store.setVocabularySaveStates((currentStates) => {
      const nextStates = { ...currentStates };
      delete nextStates[key];
      return nextStates;
    });
  };

  return {
    getSuggestionState,
    saveSuggestion,
  };
}
