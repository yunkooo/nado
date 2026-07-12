import { useEffect, useRef } from "react";
import {
  createVocabularySuggestionKey,
  isVocabularySuggestionSaved,
} from "@nado/shared/vocabulary";
import type {
  VocabularySuggestion,
  VocabularySuggestionSaveState,
} from "@nado/shared/analysis-presentation";
import { getCurrentAccessToken } from "../../auth/authClient";
import { getAuthStateSnapshot } from "../../auth/authState";
import { saveVocabularyItem } from "../../api/vocabularyApi";
import type { AnalysisStateStore } from "./analysisState";
import {
  vocabularyStateStore,
  type VocabularyStateSnapshot,
} from "../vocabulary/vocabularyState";

type UseVocabularySuggestionSaverOptions = {
  store: AnalysisStateStore;
  userId: string | null;
  vocabularySaveStates: Record<string, VocabularySuggestionSaveState>;
  vocabularyState: VocabularyStateSnapshot;
};

const loginRequiredNotice = {
  text: "로그인이 필요해요. Google 로그인 후 단어장에 저장할 수 있어요.",
  tone: "error" as const,
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
    const key = createVocabularySuggestionKey(suggestion);

    if (vocabularySaveStates[key] === "saving") {
      return "saving" as const;
    }

    if (isVocabularySuggestionSaved(vocabularyState.items, suggestion)) {
      return "saved" as const;
    }

    return "idle" as const;
  };

  const saveSuggestion = async (suggestion: VocabularySuggestion) => {
    const key = createVocabularySuggestionKey(suggestion);

    if (getSuggestionState(suggestion) !== "idle") {
      return;
    }

    const requestUserId = userId;

    if (!requestUserId) {
      store.setVocabularySaveMessage(loginRequiredNotice);
      return;
    }

    if (pendingSuggestionKeysRef.current.has(key)) {
      return;
    }

    pendingSuggestionKeysRef.current.add(key);
    store.setVocabularySaveMessage(null);
    store.setVocabularySaveStates((currentStates) =>
      markVocabularySuggestionSaving(currentStates, key),
    );

    try {
      const accessToken = await getCurrentAccessToken();

      if (
        !isRequestUserCurrent(requestUserId, latestUserIdRef.current, store)
      ) {
        return;
      }

      if (!accessToken) {
        store.setVocabularySaveMessage(loginRequiredNotice);
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
        !isRequestUserCurrent(requestUserId, latestUserIdRef.current, store)
      ) {
        return;
      }

      if (result.status === "success") {
        vocabularyStateStore.upsertItem(result.data);
        store.setVocabularySaveMessage({
          text: "단어장에 저장했어요.",
          tone: "success",
        });
        return;
      }

      store.setVocabularySaveMessage({
        text: result.message,
        tone: "error",
      });
    } catch {
      if (isRequestUserCurrent(requestUserId, latestUserIdRef.current, store)) {
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
      !isRequestUserCurrent(requestUserId, latestUserIdRef.current, store)
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

export function markVocabularySuggestionSaving(
  currentStates: Record<string, VocabularySuggestionSaveState>,
  key: string,
) {
  return {
    ...currentStates,
    [key]: "saving" as const,
  };
}

function isRequestUserCurrent(
  requestUserId: string,
  latestUserId: string | null,
  store: AnalysisStateStore,
) {
  const authState = getAuthStateSnapshot();

  return (
    requestUserId === latestUserId &&
    store.isUserScopeCurrent(requestUserId) &&
    authState.status !== "loading" &&
    (authState.session?.user.id ?? null) === requestUserId
  );
}
