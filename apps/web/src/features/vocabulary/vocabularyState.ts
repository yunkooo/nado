"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { normalizeVocabularyTerm, type VocabularyItem } from "@nado/shared";
import type { AuthStateSnapshot } from "../auth/authState";
import { getCurrentAccessToken } from "../auth/authClient";
import {
  listVocabulary,
  VOCABULARY_ERROR_MESSAGE,
  type VocabularyListResult,
} from "./vocabularyApi";

export type VocabularyStateStatus = "idle" | "loading" | "ready" | "error";

export type VocabularyStateSnapshot = {
  accessToken: string | null;
  items: VocabularyItem[];
  message: string | null;
  status: VocabularyStateStatus;
};

export type VocabularySuggestionMatch = {
  meaning: string;
  note?: string;
  term: string;
  type: VocabularyItem["type"];
};

type VocabularyStateStore = ReturnType<typeof createVocabularyStateStore>;
type AccessTokenProvider = () => Promise<string | null>;
type VocabularyListLoader = (
  accessToken: string,
) => Promise<VocabularyListResult>;

const initialSnapshot: VocabularyStateSnapshot = {
  accessToken: null,
  items: [],
  message: null,
  status: "idle",
};

export function createVocabularyStateStore() {
  const listeners = new Set<() => void>();
  let snapshot = initialSnapshot;

  const notify = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const setSnapshot = (nextSnapshot: VocabularyStateSnapshot) => {
    snapshot = nextSnapshot;
    notify();
  };

  return {
    getSnapshot() {
      return snapshot;
    },

    reset() {
      setSnapshot(initialSnapshot);
    },

    removeItem(itemId: string) {
      setSnapshot({
        ...snapshot,
        items: snapshot.items.filter((item) => item.id !== itemId),
      });
    },

    setError(accessToken: string, message: string) {
      setSnapshot({
        accessToken,
        items: [],
        message,
        status: "error",
      });
    },

    setLoading(accessToken: string) {
      setSnapshot({
        accessToken,
        items: snapshot.accessToken === accessToken ? snapshot.items : [],
        message: null,
        status: "loading",
      });
    },

    setReady(accessToken: string, items: VocabularyItem[]) {
      setSnapshot({
        accessToken,
        items,
        message: null,
        status: "ready",
      });
    },

    subscribe(listener: () => void) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },

    upsertItem(item: VocabularyItem) {
      const nextItems = [
        item,
        ...snapshot.items.filter((currentItem) => currentItem.id !== item.id),
      ];

      setSnapshot({
        ...snapshot,
        items: nextItems,
      });
    },
  };
}

export const vocabularyStateStore = createVocabularyStateStore();

export function useVocabularyState(): VocabularyStateSnapshot {
  return useSyncExternalStore(
    vocabularyStateStore.subscribe,
    vocabularyStateStore.getSnapshot,
    vocabularyStateStore.getSnapshot,
  );
}

export function createVocabularyAuthSync({
  getAccessToken = getCurrentAccessToken,
  listVocabulary: loadVocabulary = listVocabulary,
  store = vocabularyStateStore,
}: {
  getAccessToken?: AccessTokenProvider;
  listVocabulary?: VocabularyListLoader;
  store?: VocabularyStateStore;
} = {}) {
  let requestSequence = 0;

  async function loadVocabularyForSession(
    accessToken: string,
    {
      refreshAccessToken = false,
      showLoading = true,
    }: { refreshAccessToken?: boolean; showLoading?: boolean } = {},
  ) {
    requestSequence += 1;
    const requestId = requestSequence;

    let currentAccessToken = accessToken;

    if (showLoading) {
      store.setLoading(accessToken);
    }

    if (refreshAccessToken) {
      currentAccessToken = await readCurrentAccessToken(
        getAccessToken,
        accessToken,
      );

      if (requestId !== requestSequence) {
        return;
      }

      if (showLoading && currentAccessToken !== accessToken) {
        store.setLoading(currentAccessToken);
      }
    }

    const result = await loadVocabulary(currentAccessToken).catch(
      (): VocabularyListResult => ({
        message: VOCABULARY_ERROR_MESSAGE,
        status: "error",
      }),
    );
    const currentState = store.getSnapshot();

    if (
      requestId !== requestSequence ||
      (currentState.accessToken !== accessToken &&
        currentState.accessToken !== currentAccessToken) ||
      (showLoading && currentState.status !== "loading")
    ) {
      return;
    }

    if (result.status === "success") {
      store.setReady(currentAccessToken, result.data);
      return;
    }

    if (showLoading) {
      store.setError(currentAccessToken, result.message);
    }
  }

  return {
    refresh(authState: AuthStateSnapshot) {
      if (authState.status !== "authenticated" || !authState.accessToken) {
        return;
      }

      const vocabularyState = store.getSnapshot();

      if (
        vocabularyState.accessToken === authState.accessToken &&
        vocabularyState.status === "loading"
      ) {
        return;
      }

      void loadVocabularyForSession(authState.accessToken, {
        refreshAccessToken: true,
        showLoading:
          vocabularyState.accessToken !== authState.accessToken ||
          vocabularyState.status !== "ready",
      });
    },

    sync(authState: AuthStateSnapshot) {
      if (authState.status === "loading") {
        return;
      }

      if (authState.status !== "authenticated" || !authState.accessToken) {
        requestSequence += 1;
        store.reset();
        return;
      }

      const vocabularyState = store.getSnapshot();

      if (
        !shouldLoadVocabularyForSession(vocabularyState, authState.accessToken)
      ) {
        return;
      }

      void loadVocabularyForSession(authState.accessToken);
    },
  };
}

const vocabularyAuthSync = createVocabularyAuthSync();

async function readCurrentAccessToken(
  getAccessToken: AccessTokenProvider,
  fallbackAccessToken: string,
) {
  try {
    return (await getAccessToken()) ?? fallbackAccessToken;
  } catch {
    return fallbackAccessToken;
  }
}

export function useSyncVocabularyForAuth(authState: AuthStateSnapshot) {
  useEffect(() => {
    vocabularyAuthSync.sync(authState);
  }, [authState.accessToken, authState.status]);
}

export function useRefreshVocabularyForActiveStudySurface(
  authState: AuthStateSnapshot,
  isStudySurfaceActive: boolean,
  refreshKey: unknown = isStudySurfaceActive,
) {
  const latestAuthStateRef = useRef(authState);
  latestAuthStateRef.current = authState;

  useEffect(() => {
    if (!isStudySurfaceActive) {
      return;
    }

    vocabularyAuthSync.refresh(authState);
  }, [
    authState.accessToken,
    authState.status,
    isStudySurfaceActive,
    refreshKey,
  ]);

  useEffect(() => {
    if (!isStudySurfaceActive) {
      return;
    }

    const refreshVocabulary = () => {
      vocabularyAuthSync.refresh(latestAuthStateRef.current);
    };
    const refreshVisibleVocabulary = () => {
      if (document.visibilityState === "visible") {
        refreshVocabulary();
      }
    };

    window.addEventListener("focus", refreshVocabulary);
    document.addEventListener("visibilitychange", refreshVisibleVocabulary);

    return () => {
      window.removeEventListener("focus", refreshVocabulary);
      document.removeEventListener(
        "visibilitychange",
        refreshVisibleVocabulary,
      );
    };
  }, [isStudySurfaceActive]);
}

export function shouldLoadVocabularyForSession(
  vocabularyState: VocabularyStateSnapshot,
  accessToken: string,
) {
  if (vocabularyState.accessToken !== accessToken) {
    return true;
  }

  return (
    vocabularyState.status !== "loading" && vocabularyState.status !== "ready"
  );
}

export function isVocabularySuggestionSaved(
  items: VocabularyItem[],
  suggestion: VocabularySuggestionMatch,
) {
  const suggestionTerm = normalizeVocabularyTerm(suggestion.term);
  const suggestionMeaning = suggestion.meaning.trim();
  const suggestionNote = suggestion.note?.trim() ?? "";

  return items.some((item) => {
    if (
      item.type !== suggestion.type ||
      normalizeVocabularyTerm(item.term) !== suggestionTerm
    ) {
      return false;
    }

    return item.meanings.some(
      (meaning) =>
        meaning.meaning.trim() === suggestionMeaning &&
        (meaning.note?.trim() ?? "") === suggestionNote,
    );
  });
}
