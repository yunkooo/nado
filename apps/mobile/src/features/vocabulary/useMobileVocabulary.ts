import {
  createVocabularyRealtimeRefreshScheduler,
  type VocabularyRealtimeRefreshScheduler,
} from "@nado/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { readMobileApiBaseUrl } from "../../api/apiConfig";
import { getMobileSupabaseClient } from "../../auth/authClient";
import type { MobileAuthStateSnapshot } from "../../auth/authState";
import {
  applyDeleteVocabularyError,
  createMobileVocabularySuggestionKey,
  isMobileVocabularySuggestionSaved,
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
  const [savingSuggestionKey, setSavingSuggestionKey] = useState<string | null>(
    null,
  );
  const [vocabularyState, setVocabularyState] = useState<MobileVocabularyState>(
    initialVocabularyState,
  );
  const accessTokenRef = useRef<string | null>(null);
  const latestAuthStateRef = useRef(authState);
  const requestSequenceRef = useRef(0);
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
      options: { preserveCurrentOnError: boolean; showLoading: boolean },
    ) => {
      const { preserveCurrentOnError, showLoading } = options;

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
        setTrackedVocabularyState(() => ({
          items: result.data,
          message: null,
          status: "ready",
        }));
        return;
      }

      setTrackedVocabularyState((currentState) => {
        if (preserveCurrentOnError && currentState.items.length > 0) {
          return {
            ...currentState,
            message: result.message,
            status: "ready",
          };
        }

        return {
          items: [],
          message: result.message,
          status: "error",
        };
      });
    },
    [setTrackedVocabularyState],
  );

  const refreshVocabularyInBackground = useCallback(() => {
    const latestAuthState = latestAuthStateRef.current;

    if (
      latestAuthState.status !== "authenticated" ||
      !latestAuthState.accessToken
    ) {
      return;
    }

    return loadVocabulary(latestAuthState.accessToken, {
      preserveCurrentOnError: true,
      showLoading: false,
    });
  }, [loadVocabulary]);

  useEffect(() => {
    if (authState.status === "loading") {
      return;
    }

    if (authState.status !== "authenticated" || !authState.accessToken) {
      requestSequenceRef.current += 1;
      accessTokenRef.current = null;
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

    void loadVocabulary(authState.accessToken, {
      preserveCurrentOnError: true,
      showLoading: false,
    });
  }, [
    authState.accessToken,
    authState.status,
    isStudySurfaceActive,
    loadVocabulary,
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
        refresh: refreshVocabularyInBackground,
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
    if (authState.status !== "authenticated" || !authState.accessToken) {
      return;
    }

    setDeletingItemId(itemId);
    const result = await deleteVocabularyItem(itemId, authState.accessToken, {
      apiBaseUrl: configuredMobileApiBaseUrl,
      apiPlatform: configuredMobileApiPlatform,
    });
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
    if (
      savingSuggestionKey === createMobileVocabularySuggestionKey(suggestion)
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

    if (authState.status !== "authenticated" || !authState.accessToken) {
      setSaveMessage(
        "로그인이 필요해요. Google 로그인 후 단어장에 저장할 수 있어요.",
      );
      return;
    }

    const suggestionKey = createMobileVocabularySuggestionKey(suggestion);
    setSaveMessage(null);
    setSavingSuggestionKey(suggestionKey);

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

    setSavingSuggestionKey(null);

    if (result.status === "success") {
      setTrackedVocabularyState((currentState) =>
        upsertMobileVocabularyItem(currentState, result.data),
      );
      setSaveMessage("단어장에 저장했어요.");
      return;
    }

    setSaveMessage(result.message);
  };

  return [
    vocabularyState,
    {
      clearSaveMessage: () => setSaveMessage(null),
      deleteItem,
      deletingItemId,
      getSuggestionState,
      saveMessage,
      saveSuggestion,
    },
  ];
}
