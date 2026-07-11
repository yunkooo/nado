import {
  createVocabularyRealtimeRefreshScheduler,
  shouldApplyUserScopedMutation,
  shouldStartVocabularyManualRefresh,
  shouldRefreshVocabularyFromLifecycle,
  VOCABULARY_MANUAL_REFRESH_THROTTLE_MS,
  type VocabularyRealtimeRefreshScheduler,
} from "@nado/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { readMobileApiBaseUrl } from "../../api/apiConfig";
import { getMobileSupabaseClient } from "../../auth/authClient";
import type { MobileAuthStateSnapshot } from "../../auth/authState";
import {
  addMobileVocabularySavingKey,
  applyDeleteVocabularyError,
  applyLoadVocabularyError,
  createMobileVocabularySuggestionKey,
  isMobileVocabularySuggestionSaved,
  removeMobileVocabularySavingKey,
  upsertMobileVocabularyItem,
  type MobileVocabularyState,
} from "./mobileVocabularyState";
import type { MobileVocabularySuggestion } from "../../api/analysisApi";
import {
  deleteVocabularyItem,
  listVocabulary,
  saveVocabularyItem,
} from "../../api/vocabularyApi";
import {
  subscribeMobileVocabularyRealtime,
  updateMobileVocabularyRealtimeAuth,
} from "./mobileVocabularyRealtime";

export type { MobileVocabularyState } from "./mobileVocabularyState";

export type MobileVocabularyActions = {
  clearSaveMessage(): void;
  deleteItem(itemId: string): Promise<void>;
  deletingItemId: string | null;
  getSuggestionState(
    suggestion: MobileVocabularySuggestion,
  ): "idle" | "saved" | "saving";
  isRefreshing: boolean;
  refreshVocabulary(): Promise<void>;
  saveMessage: string | null;
  saveSuggestion(suggestion: MobileVocabularySuggestion): Promise<void>;
};

const configuredMobileApiBaseUrl = readMobileApiBaseUrl();
const configuredMobileApiPlatform = Platform.OS;

const initialVocabularyState: MobileVocabularyState = {
  items: [],
  message: null,
  status: "idle",
};

export function useMobileVocabulary(
  authState: MobileAuthStateSnapshot,
  isStudySurfaceActive = false,
  refreshKey: unknown = isStudySurfaceActive,
): [MobileVocabularyState, MobileVocabularyActions] {
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [savingSuggestionKeys, setSavingSuggestionKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [vocabularyState, setVocabularyState] = useState<MobileVocabularyState>(
    initialVocabularyState,
  );
  const accessTokenRef = useRef<string | null>(null);
  const lastLoadedAtRef = useRef<number | undefined>(undefined);
  const lastManualRefreshStartedAtRef = useRef<number | undefined>(undefined);
  const latestAuthStateRef = useRef(authState);
  const requestSequenceRef = useRef(0);
  const isRefreshingRef = useRef(false);
  const savingSuggestionKeysRef = useRef<Set<string>>(new Set());
  const realtimeRefreshSchedulerRef =
    useRef<VocabularyRealtimeRefreshScheduler | null>(null);
  const statusRef = useRef<MobileVocabularyState["status"]>(
    initialVocabularyState.status,
  );
  latestAuthStateRef.current = authState;

  const setTrackedVocabularyState = useCallback(
    (
      resolveState: (
        currentState: MobileVocabularyState,
      ) => MobileVocabularyState,
    ) => {
      setVocabularyState((currentState) => {
        const nextState = resolveState(currentState);
        statusRef.current = nextState.status;
        return nextState;
      });
    },
    [],
  );

  const loadVocabulary = useCallback(
    async (
      accessToken: string,
      options: {
        force?: boolean;
        preserveCurrentOnError: boolean;
        showLoading: boolean;
      },
    ) => {
      const { force = false, preserveCurrentOnError, showLoading } = options;

      if (
        !force &&
        !showLoading &&
        !shouldRefreshVocabularyFromLifecycle({
          isStudySurfaceActive: true,
          lastLoadedAt: lastLoadedAtRef.current,
          now: Date.now(),
          status: statusRef.current,
        })
      ) {
        return;
      }

      if (
        !showLoading &&
        accessTokenRef.current === accessToken &&
        statusRef.current === "loading"
      ) {
        return;
      }

      requestSequenceRef.current += 1;
      const requestId = requestSequenceRef.current;
      accessTokenRef.current = accessToken;

      if (showLoading) {
        setTrackedVocabularyState((currentState) => ({
          items: currentState.items,
          message: null,
          status: "loading",
        }));
      }

      const result = await listVocabulary(accessToken, {
        apiBaseUrl: configuredMobileApiBaseUrl,
        apiPlatform: configuredMobileApiPlatform,
      });

      if (
        requestId !== requestSequenceRef.current ||
        accessTokenRef.current !== accessToken
      ) {
        return;
      }

      if (result.status === "success") {
        lastLoadedAtRef.current = Date.now();
        setTrackedVocabularyState(() => ({
          items: result.data,
          message: null,
          status: "ready",
        }));
        return;
      }

      setTrackedVocabularyState((currentState) => {
        return applyLoadVocabularyError(currentState, {
          message: result.message,
          preserveCurrentOnError,
        });
      });
    },
    [setTrackedVocabularyState],
  );

  const refreshVocabularyInBackground = useCallback(
    (options?: { force?: boolean }) => {
      const latestAuthState = latestAuthStateRef.current;

      if (
        latestAuthState.status !== "authenticated" ||
        !latestAuthState.accessToken
      ) {
        return;
      }

      return loadVocabulary(latestAuthState.accessToken, {
        force: options?.force ?? false,
        preserveCurrentOnError: true,
        showLoading: false,
      });
    },
    [loadVocabulary],
  );

  const refreshVocabulary = useCallback(async () => {
    const now = Date.now();

    if (
      !shouldStartVocabularyManualRefresh({
        isRefreshing: isRefreshingRef.current,
        lastStartedAt: lastManualRefreshStartedAtRef.current,
        now,
        throttleMs: VOCABULARY_MANUAL_REFRESH_THROTTLE_MS,
      })
    ) {
      return;
    }

    const refreshPromise = refreshVocabularyInBackground({ force: true });

    if (!refreshPromise) {
      return;
    }

    isRefreshingRef.current = true;
    lastManualRefreshStartedAtRef.current = now;
    setIsRefreshing(true);

    try {
      await refreshPromise;
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, [refreshVocabularyInBackground]);

  useEffect(() => {
    savingSuggestionKeysRef.current = new Set();
    setSavingSuggestionKeys(new Set());
    setDeletingItemId(null);
    setSaveMessage(null);
  }, [authState.session?.user.id]);

  useEffect(() => {
    if (authState.status === "loading") {
      return;
    }

    if (authState.status !== "authenticated" || !authState.accessToken) {
      requestSequenceRef.current += 1;
      accessTokenRef.current = null;
      lastLoadedAtRef.current = undefined;
      lastManualRefreshStartedAtRef.current = undefined;
      isRefreshingRef.current = false;
      setIsRefreshing(false);
      setTrackedVocabularyState(() => initialVocabularyState);
      return;
    }

    void loadVocabulary(authState.accessToken, {
      preserveCurrentOnError: false,
      showLoading: true,
    });
  }, [
    authState.accessToken,
    authState.status,
    loadVocabulary,
    setTrackedVocabularyState,
  ]);

  useEffect(() => {
    if (
      !isStudySurfaceActive ||
      authState.status !== "authenticated" ||
      !authState.accessToken
    ) {
      return;
    }

    void refreshVocabularyInBackground();
  }, [
    authState.accessToken,
    authState.status,
    isStudySurfaceActive,
    refreshVocabularyInBackground,
    refreshKey,
  ]);

  useEffect(() => {
    if (!isStudySurfaceActive) {
      return;
    }

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        refreshVocabularyInBackground();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isStudySurfaceActive, refreshVocabularyInBackground]);

  useEffect(() => {
    const supabase = getMobileSupabaseClient();

    if (
      !supabase ||
      authState.status !== "authenticated" ||
      !authState.accessToken
    ) {
      return;
    }

    updateMobileVocabularyRealtimeAuth({
      accessToken: authState.accessToken,
      client: supabase,
    });
  }, [authState.accessToken, authState.status]);

  useEffect(() => {
    const supabase = getMobileSupabaseClient();

    if (
      !supabase ||
      authState.status !== "authenticated" ||
      !authState.accessToken
    ) {
      return;
    }

    realtimeRefreshSchedulerRef.current =
      createVocabularyRealtimeRefreshScheduler({
        refresh: () => refreshVocabularyInBackground({ force: true }),
      });

    const unsubscribe = subscribeMobileVocabularyRealtime({
      accessToken: authState.accessToken,
      client: supabase,
      onChange: () => realtimeRefreshSchedulerRef.current?.schedule(),
      userId: authState.session?.user.id,
    });

    return () => {
      realtimeRefreshSchedulerRef.current?.cancel();
      realtimeRefreshSchedulerRef.current = null;
      unsubscribe();
    };
  }, [
    authState.session?.user.id,
    authState.status,
    refreshVocabularyInBackground,
  ]);

  const deleteItem = async (itemId: string) => {
    const requestUserId = authState.session?.user.id;

    if (
      authState.status !== "authenticated" ||
      !authState.accessToken ||
      !requestUserId
    ) {
      return;
    }

    setDeletingItemId(itemId);
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

    setDeletingItemId(null);

    if (result.status !== "success") {
      setTrackedVocabularyState((currentState) =>
        applyDeleteVocabularyError(currentState, result.message),
      );
      return;
    }

    setTrackedVocabularyState((currentState) => ({
      ...currentState,
      items: currentState.items.filter((item) => item.id !== itemId),
      message: null,
      status: "ready",
    }));
  };

  const getSuggestionState = (suggestion: MobileVocabularySuggestion) => {
    const suggestionKey = createMobileVocabularySuggestionKey(suggestion);

    if (
      savingSuggestionKeys.has(suggestionKey) ||
      savingSuggestionKeysRef.current.has(suggestionKey)
    ) {
      return "saving" as const;
    }

    if (isMobileVocabularySuggestionSaved(vocabularyState.items, suggestion)) {
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

    const suggestionKey = createMobileVocabularySuggestionKey(suggestion);

    if (!markMobileVocabularySuggestionSaving(suggestionKey)) {
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

    clearMobileVocabularySuggestionSaving(suggestionKey);

    if (result.status === "success") {
      setTrackedVocabularyState((currentState) =>
        upsertMobileVocabularyItem(currentState, result.data),
      );
      setSaveMessage("단어장에 저장했어요.");
      return;
    }

    setSaveMessage(result.message);
  };

  function markMobileVocabularySuggestionSaving(key: string): boolean {
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

  function clearMobileVocabularySuggestionSaving(key: string) {
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

  return [
    vocabularyState,
    {
      clearSaveMessage: () => setSaveMessage(null),
      deleteItem,
      deletingItemId,
      getSuggestionState,
      isRefreshing,
      refreshVocabulary,
      saveMessage,
      saveSuggestion,
    },
  ];
}
