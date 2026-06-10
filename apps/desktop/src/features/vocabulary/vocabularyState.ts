import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  getDistinctVocabularyNote,
  normalizeVocabularyTerm,
  type VocabularyItem,
} from "@nado/shared";
import type { AuthStateSnapshot } from "../../auth/authState";
import {
  listVocabulary,
  VOCABULARY_ERROR_MESSAGE,
  type VocabularyListResult,
} from "../../api/vocabularyApi";

export type VocabularyStateStatus = "idle" | "loading" | "ready" | "error";
export type VocabularyRefreshResult = "failed" | "ignored" | "refreshed";

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
type VocabularyListLoader = (
  accessToken: string,
) => Promise<VocabularyListResult>;

const initialSnapshot: VocabularyStateSnapshot = {
  accessToken: null,
  items: [],
  message: null,
  status: "idle",
};

const VOCABULARY_BACKGROUND_REFRESH_STALE_MS = 60 * 1000;

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
  listVocabulary: loadVocabulary = listVocabulary,
  store = vocabularyStateStore,
}: {
  listVocabulary?: VocabularyListLoader;
  store?: VocabularyStateStore;
} = {}) {
  let requestSequence = 0;

  async function loadVocabularyForSession(
    accessToken: string,
    { showLoading = true }: { showLoading?: boolean } = {},
  ): Promise<VocabularyRefreshResult> {
    requestSequence += 1;
    const requestId = requestSequence;

    if (showLoading) {
      store.setLoading(accessToken);
    }

    const result = await loadVocabulary(accessToken).catch(
      (): VocabularyListResult => ({
        message: VOCABULARY_ERROR_MESSAGE,
        status: "error",
      }),
    );
    const currentState = store.getSnapshot();

    if (
      requestId !== requestSequence ||
      currentState.accessToken !== accessToken ||
      (showLoading && currentState.status !== "loading")
    ) {
      return "ignored";
    }

    if (result.status === "success") {
      store.setReady(accessToken, result.data);
      return "refreshed";
    }

    if (showLoading) {
      store.setError(accessToken, result.message);
    }

    return "failed";
  }

  return {
    refresh(authState: AuthStateSnapshot): Promise<VocabularyRefreshResult> {
      if (authState.status !== "authenticated" || !authState.accessToken) {
        return Promise.resolve("ignored");
      }

      const vocabularyState = store.getSnapshot();

      if (
        vocabularyState.accessToken === authState.accessToken &&
        vocabularyState.status === "loading"
      ) {
        return Promise.resolve("ignored");
      }

      return loadVocabularyForSession(authState.accessToken, {
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

export function refreshVocabularyForAuth(authState: AuthStateSnapshot) {
  return vocabularyAuthSync.refresh(authState);
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
  const lastBackgroundRefreshAtRef = useRef(0);
  latestAuthStateRef.current = authState;

  useEffect(() => {
    const vocabularyState = vocabularyStateStore.getSnapshot();
    const now = Date.now();

    if (
      !shouldRefreshActiveVocabulary({
        isStudySurfaceActive,
        lastRefreshAt: lastBackgroundRefreshAtRef.current,
        now,
        vocabularyStatus: vocabularyState.status,
      })
    ) {
      return;
    }

    lastBackgroundRefreshAtRef.current = now;
    void vocabularyAuthSync.refresh(authState);
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
      const now = Date.now();
      const vocabularyState = vocabularyStateStore.getSnapshot();

      if (
        !shouldRefreshActiveVocabulary({
          isStudySurfaceActive,
          lastRefreshAt: lastBackgroundRefreshAtRef.current,
          now,
          vocabularyStatus: vocabularyState.status,
        })
      ) {
        return;
      }

      lastBackgroundRefreshAtRef.current = now;
      void vocabularyAuthSync.refresh(latestAuthStateRef.current);
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

export function shouldRefreshActiveVocabulary({
  isStudySurfaceActive,
  lastRefreshAt,
  now,
  vocabularyStatus,
}: {
  isStudySurfaceActive: boolean;
  lastRefreshAt: number;
  now: number;
  vocabularyStatus: VocabularyStateStatus;
}) {
  if (!isStudySurfaceActive) {
    return false;
  }

  if (vocabularyStatus !== "ready") {
    return true;
  }

  return now - lastRefreshAt >= VOCABULARY_BACKGROUND_REFRESH_STALE_MS;
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
  const suggestionNote = getDistinctVocabularyNote(suggestion.note, [
    suggestionMeaning,
  ]);

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
        getDistinctVocabularyNote(meaning.note, [meaning.meaning]) ===
          suggestionNote,
    );
  });
}
