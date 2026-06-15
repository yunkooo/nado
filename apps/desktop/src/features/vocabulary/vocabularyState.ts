import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  createVocabularyRealtimeRefreshScheduler,
  createVocabularyRealtimeTopic,
  getDistinctVocabularyNote,
  normalizeVocabularyTerm,
  type VocabularyItem,
} from "@nado/shared";
import { getSupabaseBrowserClient } from "../../auth/authClient";
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
type VocabularyRealtimeEvent = "DELETE" | "INSERT" | "UPDATE";
type VocabularyRealtimeChannel = {
  on(
    type: "broadcast",
    filter: { event: VocabularyRealtimeEvent },
    callback: () => void,
  ): VocabularyRealtimeChannel;
  subscribe(): VocabularyRealtimeChannel;
};
export type VocabularyRealtimeClient = {
  channel(
    topic: string,
    options: { config: { private: true } },
  ): VocabularyRealtimeChannel;
  realtime: {
    setAuth(token?: string | null): Promise<void> | void;
  };
  removeChannel(channel: VocabularyRealtimeChannel): Promise<unknown> | unknown;
};
export type VocabularyRealtimeSubscription = {
  unsubscribe(): void;
};

const initialSnapshot: VocabularyStateSnapshot = {
  accessToken: null,
  items: [],
  message: null,
  status: "idle",
};

const VOCABULARY_BACKGROUND_REFRESH_STALE_MS = 60 * 1000;
const vocabularyRealtimeEvents: VocabularyRealtimeEvent[] = [
  "INSERT",
  "UPDATE",
  "DELETE",
];

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

export async function startVocabularyRealtimeSubscription({
  authState,
  client = getSupabaseBrowserClient() as VocabularyRealtimeClient | null,
  debounceMs,
  refresh = () => vocabularyAuthSync.refresh(authState),
}: {
  authState: AuthStateSnapshot;
  client?: VocabularyRealtimeClient | null;
  debounceMs?: number;
  refresh?: () => Promise<unknown> | unknown;
}): Promise<VocabularyRealtimeSubscription | null> {
  if (authState.status !== "authenticated" || !authState.accessToken) {
    return null;
  }

  const topic = createVocabularyRealtimeTopic(authState.session?.user.id);

  if (!client || !topic) {
    return null;
  }

  const refreshScheduler = createVocabularyRealtimeRefreshScheduler({
    debounceMs,
    refresh: () => Promise.resolve(refresh()).then(() => undefined),
  });

  await client.realtime.setAuth(authState.accessToken);

  const channel = client.channel(topic, {
    config: { private: true },
  });
  const scheduleRefresh = () => {
    refreshScheduler.schedule();
  };

  for (const event of vocabularyRealtimeEvents) {
    channel.on("broadcast", { event }, scheduleRefresh);
  }

  channel.subscribe();

  let isUnsubscribed = false;

  return {
    unsubscribe() {
      if (isUnsubscribed) {
        return;
      }

      isUnsubscribed = true;
      refreshScheduler.cancel();
      void client.removeChannel(channel);
    },
  };
}

export function useSyncVocabularyForAuth(authState: AuthStateSnapshot) {
  useEffect(() => {
    vocabularyAuthSync.sync(authState);
  }, [authState.accessToken, authState.status]);
}

export function useVocabularyRealtimeRefresh(authState: AuthStateSnapshot) {
  const latestAuthStateRef = useRef(authState);
  latestAuthStateRef.current = authState;

  useEffect(() => {
    let isActive = true;
    let subscription: VocabularyRealtimeSubscription | null = null;

    void startVocabularyRealtimeSubscription({
      authState,
      refresh: () => vocabularyAuthSync.refresh(latestAuthStateRef.current),
    }).then(
      (nextSubscription) => {
        if (!isActive) {
          nextSubscription?.unsubscribe();
          return;
        }

        subscription = nextSubscription;
      },
      () => undefined,
    );

    return () => {
      isActive = false;
      subscription?.unsubscribe();
    };
  }, [authState.accessToken, authState.session?.user.id, authState.status]);
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
