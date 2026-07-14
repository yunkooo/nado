import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  createVocabularyMeaningMutationKey,
  createVocabularySuggestionKey,
  isVocabularySuggestionSaved,
  type VocabularyMeaning,
} from "@nado/shared/vocabulary";
import { shouldApplyUserScopedMutation } from "@nado/shared/user-scope";
import { Platform } from "react-native";
import type { MobileVocabularySuggestion } from "../../api/analysisApi";
import { readMobileApiBaseUrl } from "../../api/apiConfig";
import {
  deleteVocabularyMeaning,
  saveVocabularyItem,
  VOCABULARY_ERROR_MESSAGE,
} from "../../api/vocabularyApi";
import type { MobileAuthStateSnapshot } from "../../auth/authState";
import {
  shouldReleaseHeldMobileVocabularyDeleteRequest,
  shouldReleaseMobileVocabularyDeleteRequest,
  type MobileVocabularyDeleteRequest,
  type MobileVocabularyReadySnapshot,
} from "./mobileVocabularyDeleteRequest";
import type { MobileVocabularyRefreshResult } from "./mobileVocabularyLoadCoordinator";
import {
  addMobileVocabularyDeletingId,
  addMobileVocabularyDeletingKey,
  addMobileVocabularySavingKey,
  applyDeleteVocabularyError,
  removeMobileVocabularyDeletingId,
  removeMobileVocabularyDeletingKey,
  removeMobileVocabularySavingKey,
  upsertMobileVocabularyItem,
  type MobileVocabularyState,
} from "./mobileVocabularyState";
import type { MobileVocabularyStateUpdater } from "./useMobileVocabularyLoader";

const configuredMobileApiBaseUrl = readMobileApiBaseUrl();
const configuredMobileApiPlatform = Platform.OS;

export function useMobileVocabularyMutations({
  authState,
  getLatestReadySnapshot,
  readyRevision,
  refreshVocabularyInBackground,
  updateVocabularyState,
  vocabularyState,
}: {
  authState: MobileAuthStateSnapshot;
  getLatestReadySnapshot(): MobileVocabularyReadySnapshot;
  readyRevision: number;
  refreshVocabularyInBackground(options?: {
    force?: boolean;
  }): Promise<MobileVocabularyRefreshResult>;
  updateVocabularyState: MobileVocabularyStateUpdater;
  vocabularyState: MobileVocabularyState;
}) {
  const [deletingMeaningKeys, setDeletingMeaningKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [savingSuggestionKeys, setSavingSuggestionKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const deletingItemIdsRef = useRef<Set<string>>(new Set());
  const deletingMeaningKeysRef = useRef<Set<string>>(new Set());
  const deletingRequestsByItemRef = useRef(
    new Map<string, MobileVocabularyDeleteRequest>(),
  );
  const latestAuthStateRef = useRef(authState);
  const savingSuggestionKeysRef = useRef<Set<string>>(new Set());

  useLayoutEffect(() => {
    latestAuthStateRef.current = authState;
  }, [authState]);

  useEffect(() => {
    savingSuggestionKeysRef.current = new Set();
    deletingItemIdsRef.current = new Set();
    deletingMeaningKeysRef.current = new Set();
    deletingRequestsByItemRef.current = new Map();
    setSavingSuggestionKeys(new Set());
    setDeletingMeaningKeys(new Set());
    setSaveMessage(null);
  }, [authState.session?.user.id]);

  useEffect(() => {
    const latestReadySnapshot = getLatestReadySnapshot();

    if (latestReadySnapshot.revision !== readyRevision) {
      return;
    }

    let nextDeletingIds = deletingItemIdsRef.current;
    let nextDeletingKeys = deletingMeaningKeysRef.current;
    let didReleaseRequest = false;

    for (const [itemId, request] of deletingRequestsByItemRef.current) {
      if (
        !shouldReleaseHeldMobileVocabularyDeleteRequest({
          itemId,
          readySnapshot: latestReadySnapshot,
          request,
        })
      ) {
        continue;
      }

      deletingRequestsByItemRef.current.delete(itemId);
      nextDeletingIds = removeMobileVocabularyDeletingId(
        nextDeletingIds,
        itemId,
      );
      nextDeletingKeys = removeMobileVocabularyDeletingKey(
        nextDeletingKeys,
        request.meaningKey,
      );
      didReleaseRequest = true;
    }

    if (!didReleaseRequest) {
      return;
    }

    deletingItemIdsRef.current = nextDeletingIds;
    deletingMeaningKeysRef.current = nextDeletingKeys;
    setDeletingMeaningKeys(nextDeletingKeys);
  }, [getLatestReadySnapshot, readyRevision]);

  const clearSaveMessage = useCallback(() => {
    setSaveMessage(null);
  }, []);

  const deleteMeaning = async (itemId: string, meaning: VocabularyMeaning) => {
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
    const meaningKey = createVocabularyMeaningMutationKey(itemId, meaning);
    const readyRevisionAtStart = getLatestReadySnapshot().revision;
    const nextDeletingKeys = addMobileVocabularyDeletingKey(
      deletingMeaningKeysRef.current,
      meaningKey,
    );
    deletingItemIdsRef.current = nextDeletingIds;
    deletingMeaningKeysRef.current = nextDeletingKeys;
    deletingRequestsByItemRef.current.set(itemId, {
      heldAtReadyRevision: null,
      meaningKey,
      readyRevisionAtStart,
    });
    setDeletingMeaningKeys(nextDeletingKeys);
    const result = await deleteVocabularyMeaning(
      itemId,
      meaning,
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

    const finishDelete = () => {
      deletingRequestsByItemRef.current.delete(itemId);
      const remainingDeletingIds = removeMobileVocabularyDeletingId(
        deletingItemIdsRef.current,
        itemId,
      );
      deletingItemIdsRef.current = remainingDeletingIds;
      const remainingDeletingKeys = removeMobileVocabularyDeletingKey(
        deletingMeaningKeysRef.current,
        meaningKey,
      );
      deletingMeaningKeysRef.current = remainingDeletingKeys;
      setDeletingMeaningKeys(remainingDeletingKeys);
    };

    if (result.status === "not-found") {
      let refreshResult: MobileVocabularyRefreshResult = "failed";

      try {
        refreshResult = await refreshVocabularyInBackground({ force: true });
      } catch {
        refreshResult = "failed";
      }

      if (
        !shouldApplyUserScopedMutation(
          requestUserId,
          latestAuthStateRef.current.session?.user.id,
        )
      ) {
        return;
      }

      if (refreshResult === "refreshed") {
        finishDelete();
      } else {
        const trackedRequest = deletingRequestsByItemRef.current.get(itemId);

        if (trackedRequest?.meaningKey !== meaningKey) {
          return;
        }

        const latestReadySnapshot = getLatestReadySnapshot();

        if (
          shouldReleaseMobileVocabularyDeleteRequest({
            itemId,
            readySnapshot: latestReadySnapshot,
            request: trackedRequest,
          })
        ) {
          finishDelete();
          return;
        }

        deletingRequestsByItemRef.current.set(itemId, {
          ...trackedRequest,
          heldAtReadyRevision: latestReadySnapshot.revision,
        });

        updateVocabularyState((currentState) =>
          applyDeleteVocabularyError(currentState, VOCABULARY_ERROR_MESSAGE),
        );
      }
      return;
    }

    finishDelete();

    if (result.status !== "success") {
      updateVocabularyState((currentState) =>
        applyDeleteVocabularyError(currentState, result.message),
      );
      return;
    }

    if (result.data.itemDeleted) {
      updateVocabularyState((currentState) => ({
        ...currentState,
        items: currentState.items.filter((item) => item.id !== itemId),
        message: null,
        status: "ready",
      }));
      return;
    }

    const updatedItem = result.data.item;
    updateVocabularyState((currentState) =>
      upsertMobileVocabularyItem(currentState, updatedItem),
    );
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
    deleteMeaning,
    deletingMeaningKeys,
    getSuggestionState,
    saveMessage,
    saveSuggestion,
  };
}
