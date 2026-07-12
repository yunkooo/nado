import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  createVocabularySuggestionKey,
  isVocabularySuggestionSaved,
} from "@nado/shared/vocabulary";
import { shouldApplyUserScopedMutation } from "@nado/shared/user-scope";
import { Platform } from "react-native";
import type { MobileVocabularySuggestion } from "../../api/analysisApi";
import { readMobileApiBaseUrl } from "../../api/apiConfig";
import {
  deleteVocabularyItem,
  saveVocabularyItem,
} from "../../api/vocabularyApi";
import type { MobileAuthStateSnapshot } from "../../auth/authState";
import {
  addMobileVocabularyDeletingId,
  addMobileVocabularySavingKey,
  applyDeleteVocabularyError,
  removeMobileVocabularyDeletingId,
  removeMobileVocabularySavingKey,
  upsertMobileVocabularyItem,
  type MobileVocabularyState,
} from "./mobileVocabularyState";
import type { MobileVocabularyStateUpdater } from "./useMobileVocabularyLoader";

const configuredMobileApiBaseUrl = readMobileApiBaseUrl();
const configuredMobileApiPlatform = Platform.OS;

export function useMobileVocabularyMutations({
  authState,
  updateVocabularyState,
  vocabularyState,
}: {
  authState: MobileAuthStateSnapshot;
  updateVocabularyState: MobileVocabularyStateUpdater;
  vocabularyState: MobileVocabularyState;
}) {
  const [deletingItemIds, setDeletingItemIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [savingSuggestionKeys, setSavingSuggestionKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const deletingItemIdsRef = useRef<Set<string>>(new Set());
  const latestAuthStateRef = useRef(authState);
  const savingSuggestionKeysRef = useRef<Set<string>>(new Set());

  useLayoutEffect(() => {
    latestAuthStateRef.current = authState;
  }, [authState]);

  useEffect(() => {
    savingSuggestionKeysRef.current = new Set();
    deletingItemIdsRef.current = new Set();
    setSavingSuggestionKeys(new Set());
    setDeletingItemIds(new Set());
    setSaveMessage(null);
  }, [authState.session?.user.id]);

  const clearSaveMessage = useCallback(() => {
    setSaveMessage(null);
  }, []);

  const deleteItem = async (itemId: string) => {
    const requestUserId = authState.session?.user.id;

    if (
      authState.status !== "authenticated" ||
      !authState.accessToken ||
      !requestUserId ||
      deletingItemIdsRef.current.has(itemId)
    ) {
      return;
    }

    const nextDeletingIds = addMobileVocabularyDeletingId(
      deletingItemIdsRef.current,
      itemId,
    );
    deletingItemIdsRef.current = nextDeletingIds;
    setDeletingItemIds(nextDeletingIds);
    const result = await deleteVocabularyItem(itemId, authState.accessToken, {
      apiBaseUrl: configuredMobileApiBaseUrl,
      apiPlatform: configuredMobileApiPlatform,
    });

    if (
      !shouldApplyUserScopedMutation(
        requestUserId,
        latestAuthStateRef.current.session?.user.id,
      )
    ) {
      return;
    }

    const remainingDeletingIds = removeMobileVocabularyDeletingId(
      deletingItemIdsRef.current,
      itemId,
    );
    deletingItemIdsRef.current = remainingDeletingIds;
    setDeletingItemIds(remainingDeletingIds);

    if (result.status === "error") {
      updateVocabularyState((currentState) =>
        applyDeleteVocabularyError(currentState, result.message),
      );
      return;
    }

    updateVocabularyState((currentState) => ({
      ...currentState,
      items: currentState.items.filter((item) => item.id !== itemId),
      message: null,
      status: "ready",
    }));
  };

  const getSuggestionState = (suggestion: MobileVocabularySuggestion) => {
    const suggestionKey = createVocabularySuggestionKey(suggestion);

    if (
      savingSuggestionKeys.has(suggestionKey) ||
      savingSuggestionKeysRef.current.has(suggestionKey)
    ) {
      return "saving" as const;
    }

    if (isVocabularySuggestionSaved(vocabularyState.items, suggestion)) {
      return "saved" as const;
    }

    return "idle" as const;
  };

  const saveSuggestion = async (suggestion: MobileVocabularySuggestion) => {
    if (getSuggestionState(suggestion) !== "idle") {
      return;
    }

    const requestUserId = authState.session?.user.id;

    if (
      authState.status !== "authenticated" ||
      !authState.accessToken ||
      !requestUserId
    ) {
      setSaveMessage(
        "로그인이 필요해요. Google 로그인 후 단어장에 저장할 수 있어요.",
      );
      return;
    }

    const suggestionKey = createVocabularySuggestionKey(suggestion);

    if (!markSuggestionSaving(suggestionKey)) {
      return;
    }

    setSaveMessage(null);

    const result = await saveVocabularyItem(
      {
        meaning: suggestion.meaning,
        note: suggestion.note,
        term: suggestion.term,
        type: suggestion.type,
      },
      authState.accessToken,
      {
        apiBaseUrl: configuredMobileApiBaseUrl,
        apiPlatform: configuredMobileApiPlatform,
      },
    );

    if (
      !shouldApplyUserScopedMutation(
        requestUserId,
        latestAuthStateRef.current.session?.user.id,
      )
    ) {
      return;
    }

    clearSuggestionSaving(suggestionKey);

    if (result.status === "success") {
      updateVocabularyState((currentState) =>
        upsertMobileVocabularyItem(currentState, result.data),
      );
      setSaveMessage("단어장에 저장했어요.");
      return;
    }

    setSaveMessage(result.message);
  };

  function markSuggestionSaving(key: string): boolean {
    if (savingSuggestionKeysRef.current.has(key)) {
      return false;
    }

    const nextKeys = addMobileVocabularySavingKey(
      savingSuggestionKeysRef.current,
      key,
    );
    savingSuggestionKeysRef.current = nextKeys;
    setSavingSuggestionKeys(nextKeys);
    return true;
  }

  function clearSuggestionSaving(key: string) {
    if (!savingSuggestionKeysRef.current.has(key)) {
      return;
    }

    const nextKeys = removeMobileVocabularySavingKey(
      savingSuggestionKeysRef.current,
      key,
    );
    savingSuggestionKeysRef.current = nextKeys;
    setSavingSuggestionKeys(nextKeys);
  }

  return {
    clearSaveMessage,
    deleteItem,
    deletingItemIds,
    getSuggestionState,
    saveMessage,
    saveSuggestion,
  };
}
