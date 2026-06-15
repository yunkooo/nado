import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  createVocabularyRealtimeRefreshScheduler,
  createVocabularyRealtimeTopic,
  getDistinctVocabularyNote,
  normalizeVocabularyTerm,
  shouldRefreshVocabularyFromLifecycle,
  VOCABULARY_LIFECYCLE_REFRESH_STALE_MS,
  type VocabularyRealtimeRefreshScheduler,
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
type TimestampProvider = () => number;
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
export type VocabularyRealtimeRefreshSchedulerFactory = (
  refresh: () => Promise<void> | void,
) => VocabularyRealtimeRefreshScheduler;
export type VocabularyRealtimeSubscription = {
  unsubscribe(): void;
};

const initialSnapshot: VocabularyStateSnapshot = {
  accessToken: null,
  items: [],
  message: null,
  status: "idle",
};

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
  now = () => Date.now(),
  refreshStaleMs = VOCABULARY_LIFECYCLE_REFRESH_STALE_MS,
  store = vocabularyStateStore,
}: {
  listVocabulary?: VocabularyListLoader;
  now?: TimestampProvider;
  refreshStaleMs?: number;
  store?: VocabularyStateStore;
} = {}) {
  let requestSequence = 0;
  const loadedAtByAccessToken = new Map<string, number>();

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
      loadedAtByAccessToken.set(accessToken, now());
      store.setReady(accessToken, result.data);
      return "refreshed";
    }

    if (showLoading) {
      store.setError(accessToken, result.message);
    }

    return "failed";
  }

  function waitForCurrentLoadToSettle(accessToken: string) {
    const currentState = store.getSnapshot();

    if (
      currentState.accessToken !== accessToken ||
      currentState.status !== "loading"
    ) {
      return Promise.resolve(currentState.accessToken === accessToken);
    }

    return new Promise<boolean>((resolve) => {
      const unsubscribe = store.subscribe(() => {
        const nextState = store.getSnapshot();

        if (
          nextState.accessToken === accessToken &&
          nextState.status === "loading"
        ) {
          return;
        }

        unsubscribe();
        resolve(nextState.accessToken === accessToken);
      });
    });
  }

  function refresh(
    authState: AuthStateSnapshot,
    { force = false }: { force?: boolean } = {},
  ): Promise<VocabularyRefreshResult> {
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

    if (
      !force &&
      !shouldRefreshVocabularyFromLifecycle({
        isStudySurfaceActive: true,
        lastLoadedAt: loadedAtByAccessToken.get(authState.accessToken),
        now: now(),
        staleMs: refreshStaleMs,
        status: vocabularyState.status,
      })
    ) {
      return Promise.resolve("ignored");
    }

    return loadVocabularyForSession(authState.accessToken, {
      showLoading:
        vocabularyState.accessToken !== authState.accessToken ||
        vocabularyState.status !== "ready",
    });
  }

  return {
    refresh,

    async refreshAfterCurrentLoad(
      authState: AuthStateSnapshot,
    ): Promise<VocabularyRefreshResult> {
      if (authState.status !== "authenticated" || !authState.accessToken) {
        return "ignored";
      }

      const vocabularyState = store.getSnapshot();

      if (
        vocabularyState.accessToken === authState.accessToken &&
        vocabularyState.status === "loading"
      ) {
        const isSameSession = await waitForCurrentLoadToSettle(
          authState.accessToken,
        );

        if (!isSameSession) {
          return "ignored";
        }
      }

      return refresh(authState, { force: true });
    },

    sync(authState: AuthStateSnapshot) {
      if (authState.status === "loading") {
        return;
      }

      if (authState.status !== "authenticated" || !authState.accessToken) {
        requestSequence += 1;
        loadedAtByAccessToken.clear();
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
const vocabularyRealtimeSync = createVocabularyRealtimeSync();

export function refreshVocabularyForAuth(authState: AuthStateSnapshot) {
  return vocabularyAuthSync.refresh(authState);
}

export async function startVocabularyRealtimeSubscription({
  authState,
  client = getSupabaseBrowserClient() as VocabularyRealtimeClient | null,
  debounceMs,
  refresh = () => vocabularyAuthSync.refreshAfterCurrentLoad(authState),
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
  let isUnsubscribed = false;
  const scheduleRefresh = () => {
    if (!isUnsubscribed) {
      refreshScheduler.schedule();
    }
  };

  for (const event of vocabularyRealtimeEvents) {
    channel.on("broadcast", { event }, scheduleRefresh);
  }

  channel.subscribe();

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

export function createVocabularyRealtimeSync({
  createRefreshScheduler = (refresh) =>
    createVocabularyRealtimeRefreshScheduler({ refresh }),
  getClient = () =>
    getSupabaseBrowserClient() as VocabularyRealtimeClient | null,
  refresh = (authState) =>
    vocabularyAuthSync.refreshAfterCurrentLoad(authState),
}: {
  createRefreshScheduler?: VocabularyRealtimeRefreshSchedulerFactory;
  getClient?: () => VocabularyRealtimeClient | null;
  refresh?: (authState: AuthStateSnapshot) => Promise<unknown> | unknown;
} = {}) {
  let activeAccessToken: string | null = null;
  let activeChannel: VocabularyRealtimeChannel | null = null;
  let activeClient: VocabularyRealtimeClient | null = null;
  let activeScheduler: VocabularyRealtimeRefreshScheduler | null = null;
  let activeTopic: string | null = null;
  let channelRemovalPromise: Promise<unknown> = Promise.resolve();
  let subscriptionSequence = 0;

  const removeActiveChannel = () => {
    activeScheduler?.cancel();

    const channel = activeChannel;
    const client = activeClient;

    activeAccessToken = null;
    activeChannel = null;
    activeClient = null;
    activeScheduler = null;
    activeTopic = null;

    if (channel && client) {
      channelRemovalPromise = Promise.resolve(
        client.removeChannel(channel),
      ).catch(() => undefined);
    }

    return channelRemovalPromise;
  };

  const cleanup = () => {
    subscriptionSequence += 1;
    return removeActiveChannel();
  };

  return {
    cleanup,

    sync(authState: AuthStateSnapshot) {
      const topic = createVocabularyRealtimeTopic(authState.session?.user.id);

      if (
        authState.status !== "authenticated" ||
        !authState.accessToken ||
        !topic
      ) {
        cleanup();
        return;
      }

      if (
        activeTopic === topic &&
        activeAccessToken === authState.accessToken &&
        activeChannel
      ) {
        return;
      }

      const channelRemoval = cleanup();
      const client = getClient();

      if (!client) {
        return;
      }

      subscriptionSequence += 1;
      const requestId = subscriptionSequence;
      const scheduler = createRefreshScheduler(() =>
        Promise.resolve(refresh(authState)).then(() => undefined),
      );

      void channelRemoval
        .then(async () => {
          if (requestId !== subscriptionSequence) {
            scheduler.cancel();
            return;
          }

          await client.realtime.setAuth(authState.accessToken);

          if (requestId !== subscriptionSequence) {
            scheduler.cancel();
            return;
          }

          const channel = client.channel(topic, {
            config: { private: true },
          });
          const isCurrentSubscription = () =>
            requestId === subscriptionSequence &&
            activeAccessToken === authState.accessToken &&
            activeChannel === channel &&
            activeScheduler === scheduler &&
            activeTopic === topic;

          for (const event of vocabularyRealtimeEvents) {
            channel.on("broadcast", { event }, () => {
              if (isCurrentSubscription()) {
                scheduler.schedule();
              }
            });
          }

          activeAccessToken = authState.accessToken;
          activeChannel = channel;
          activeClient = client;
          activeScheduler = scheduler;
          activeTopic = topic;

          channel.subscribe();
        })
        .catch(() => {
          scheduler.cancel();
        });
    },
  };
}

export function useSyncVocabularyForAuth(authState: AuthStateSnapshot) {
  useEffect(() => {
    vocabularyAuthSync.sync(authState);
  }, [authState.accessToken, authState.status]);
}

export function useSyncVocabularyRealtimeForAuth(authState: AuthStateSnapshot) {
  useEffect(() => {
    vocabularyRealtimeSync.sync(authState);

    return () => {
      void vocabularyRealtimeSync.cleanup();
    };
  }, [authState.accessToken, authState.session?.user.id, authState.status]);
}

export const useVocabularyRealtimeRefresh = useSyncVocabularyRealtimeForAuth;

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
  return shouldRefreshVocabularyFromLifecycle({
    isStudySurfaceActive,
    lastLoadedAt: lastRefreshAt,
    now,
    status: vocabularyStatus,
  });
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
