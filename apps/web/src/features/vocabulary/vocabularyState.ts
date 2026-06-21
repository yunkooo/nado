"use client";

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
import type { AuthStateSnapshot } from "../auth/authState";
import {
  getCurrentAccessToken,
  getSupabaseBrowserClient,
} from "../auth/authClient";
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
type TimestampProvider = () => number;
export type VocabularyRealtimeChannel = {
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
    setAuth(accessToken?: string | null): Promise<void>;
  };
  removeChannel(channel: VocabularyRealtimeChannel): Promise<unknown>;
};
export type VocabularyRealtimeRefreshSchedulerFactory = (
  refresh: () => Promise<void> | void,
) => VocabularyRealtimeRefreshScheduler;

type VocabularyRealtimeEvent = "DELETE" | "INSERT" | "UPDATE";
type VocabularyRealtimeClientProvider = () => VocabularyRealtimeClient | null;
type VocabularyRealtimeRefresher = (
  authState: AuthStateSnapshot,
) => Promise<void> | void;

const VOCABULARY_REALTIME_EVENTS: VocabularyRealtimeEvent[] = [
  "INSERT",
  "UPDATE",
  "DELETE",
];

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
  now = () => Date.now(),
  refreshStaleMs = VOCABULARY_LIFECYCLE_REFRESH_STALE_MS,
  store = vocabularyStateStore,
}: {
  getAccessToken?: AccessTokenProvider;
  listVocabulary?: VocabularyListLoader;
  now?: TimestampProvider;
  refreshStaleMs?: number;
  store?: VocabularyStateStore;
} = {}) {
  let requestSequence = 0;
  let activeLoadPromise: Promise<void> | null = null;
  let pendingForcedRefreshAccessToken: string | null = null;
  const loadedAtByAccessToken = new Map<string, number>();

  async function loadVocabularyForSession(
    accessToken: string,
    {
      refreshAccessToken = false,
      showLoading = true,
    }: { refreshAccessToken?: boolean; showLoading?: boolean } = {},
  ): Promise<void> {
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
      loadedAtByAccessToken.set(currentAccessToken, now());
      store.setReady(currentAccessToken, result.data);
      return runPendingForcedRefresh(accessToken, currentAccessToken);
    }

    if (showLoading) {
      store.setError(currentAccessToken, result.message);
    }

    return runPendingForcedRefresh(accessToken, currentAccessToken);
  }

  function startVocabularyLoad(
    accessToken: string,
    options?: Parameters<typeof loadVocabularyForSession>[1],
  ): Promise<void> {
    const loadPromise: Promise<void> = loadVocabularyForSession(
      accessToken,
      options,
    ).finally(() => {
      if (activeLoadPromise === loadPromise) {
        activeLoadPromise = null;
      }
    });

    activeLoadPromise = loadPromise;
    return loadPromise;
  }

  function queuePendingForcedRefresh(accessToken: string) {
    pendingForcedRefreshAccessToken = accessToken;
  }

  function runPendingForcedRefresh(
    accessToken: string,
    currentAccessToken: string,
  ): Promise<void> | undefined {
    if (
      pendingForcedRefreshAccessToken !== accessToken &&
      pendingForcedRefreshAccessToken !== currentAccessToken
    ) {
      return;
    }

    pendingForcedRefreshAccessToken = null;

    return startVocabularyLoad(currentAccessToken, {
      refreshAccessToken: true,
      showLoading: false,
    });
  }

  function refreshVocabulary(
    authState: AuthStateSnapshot,
    { force = false }: { force?: boolean } = {},
  ): Promise<void> | undefined {
    if (authState.status !== "authenticated" || !authState.accessToken) {
      return;
    }

    const vocabularyState = store.getSnapshot();

    if (
      vocabularyState.accessToken === authState.accessToken &&
      vocabularyState.status === "loading"
    ) {
      if (force) {
        queuePendingForcedRefresh(authState.accessToken);
      }

      return activeLoadPromise ?? undefined;
    }

    if (
      !force &&
      vocabularyState.accessToken === authState.accessToken &&
      !shouldRefreshVocabularyFromLifecycle({
        isStudySurfaceActive: true,
        lastLoadedAt: loadedAtByAccessToken.get(authState.accessToken),
        now: now(),
        staleMs: refreshStaleMs,
        status: vocabularyState.status,
      })
    ) {
      return;
    }

    return startVocabularyLoad(authState.accessToken, {
      refreshAccessToken: true,
      showLoading:
        vocabularyState.accessToken !== authState.accessToken ||
        vocabularyState.status !== "ready",
    });
  }

  return {
    refresh(authState: AuthStateSnapshot) {
      return refreshVocabulary(authState);
    },

    refreshNow(authState: AuthStateSnapshot) {
      return refreshVocabulary(authState, { force: true });
    },

    sync(authState: AuthStateSnapshot) {
      if (authState.status === "loading") {
        return;
      }

      if (authState.status !== "authenticated" || !authState.accessToken) {
        requestSequence += 1;
        pendingForcedRefreshAccessToken = null;
        store.reset();
        return;
      }

      const vocabularyState = store.getSnapshot();

      if (
        !shouldLoadVocabularyForSession(vocabularyState, authState.accessToken)
      ) {
        return;
      }

      void startVocabularyLoad(authState.accessToken);
    },
  };
}

const vocabularyAuthSync = createVocabularyAuthSync();
const vocabularyRealtimeSync = createVocabularyRealtimeSync();

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

export function createVocabularyRealtimeSync({
  createRefreshScheduler = (refresh) =>
    createVocabularyRealtimeRefreshScheduler({ refresh }),
  getClient = () =>
    getSupabaseBrowserClient() as VocabularyRealtimeClient | null,
  refresh = (authState) => vocabularyAuthSync.refreshNow(authState),
}: {
  createRefreshScheduler?: VocabularyRealtimeRefreshSchedulerFactory;
  getClient?: VocabularyRealtimeClientProvider;
  refresh?: VocabularyRealtimeRefresher;
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
      channelRemovalPromise = client
        .removeChannel(channel)
        .catch(() => undefined);
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
      const scheduler = createRefreshScheduler(() => refresh(authState));

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

          for (const event of VOCABULARY_REALTIME_EVENTS) {
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

export function useSyncVocabularyRealtimeForAuth(authState: AuthStateSnapshot) {
  useEffect(() => {
    vocabularyRealtimeSync.sync(authState);

    return () => {
      void vocabularyRealtimeSync.cleanup();
    };
  }, [authState.accessToken, authState.session?.user.id, authState.status]);
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
