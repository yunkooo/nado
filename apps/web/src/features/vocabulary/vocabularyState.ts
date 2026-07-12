"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  shouldRefreshVocabularyFromLifecycle,
  VOCABULARY_LIFECYCLE_REFRESH_STALE_MS,
} from "@nado/shared/vocabulary-realtime";
import {
  createVocabularyStateStore,
  initialVocabularyStateSnapshot,
  type VocabularyStateSnapshot,
  type VocabularyStateStore,
} from "@nado/shared/vocabulary-state";
import type { AuthStateSnapshot } from "../auth/authState";
import { getCurrentAccessToken } from "../auth/authClient";
import {
  listVocabulary,
  VOCABULARY_ERROR_MESSAGE,
  type VocabularyListResult,
} from "./vocabularyApi";
import { createVocabularyRealtimeSync } from "./vocabularyRealtime";

export { createVocabularyRealtimeSync } from "./vocabularyRealtime";
export type {
  VocabularyRealtimeClient,
  VocabularyRealtimeRefreshSchedulerFactory,
} from "./vocabularyRealtime";
export { createVocabularyStateStore };
export type { VocabularyStateSnapshot };
export type { VocabularyStateStatus } from "@nado/shared/vocabulary-state";

export type VocabularyRefreshResult = "failed" | "ignored" | "refreshed";
type AccessTokenProvider = () => Promise<string | null>;
type VocabularyListLoader = (
  accessToken: string,
) => Promise<VocabularyListResult>;
type TimestampProvider = () => number;

export const vocabularyStateStore = createVocabularyStateStore();

export function useVocabularyState(): VocabularyStateSnapshot {
  return useSyncExternalStore(
    vocabularyStateStore.subscribe,
    vocabularyStateStore.getSnapshot,
    vocabularyStateStore.getSnapshot,
  );
}

export function getVocabularyStateForAuth(
  vocabularyState: VocabularyStateSnapshot,
  authState: AuthStateSnapshot,
): VocabularyStateSnapshot {
  if (authState.status === "loading") {
    return {
      accessToken: null,
      items: [],
      message: null,
      status: "loading",
    };
  }

  if (authState.status !== "authenticated" || !authState.accessToken) {
    return initialVocabularyStateSnapshot;
  }

  if (vocabularyState.accessToken === authState.accessToken) {
    return vocabularyState;
  }

  return {
    accessToken: authState.accessToken,
    items: [],
    message: null,
    status: "loading",
  };
}

export function useVocabularyStateForAuth(
  authState: AuthStateSnapshot,
): VocabularyStateSnapshot {
  return getVocabularyStateForAuth(useVocabularyState(), authState);
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
  let activeLoadPromise: Promise<VocabularyRefreshResult> | null = null;
  let activeLoadAccessToken: string | null = null;
  let pendingForcedRefreshAccessToken: string | null = null;
  const loadedAtByAccessToken = new Map<string, number>();

  async function loadVocabularyForSession(
    accessToken: string,
    {
      refreshAccessToken = false,
      showLoading = true,
    }: { refreshAccessToken?: boolean; showLoading?: boolean } = {},
  ): Promise<VocabularyRefreshResult> {
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
        return "ignored";
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
      return "ignored";
    }

    if (result.status === "success") {
      loadedAtByAccessToken.set(currentAccessToken, now());
      store.setReady(currentAccessToken, result.data);
      return (
        (await runPendingForcedRefresh(accessToken, currentAccessToken)) ??
        "refreshed"
      );
    }

    if (showLoading) {
      store.setError(currentAccessToken, result.message);
    }

    return (
      (await runPendingForcedRefresh(accessToken, currentAccessToken)) ??
      "failed"
    );
  }

  function startVocabularyLoad(
    accessToken: string,
    options?: Parameters<typeof loadVocabularyForSession>[1],
  ): Promise<VocabularyRefreshResult> {
    const loadPromise: Promise<VocabularyRefreshResult> =
      loadVocabularyForSession(accessToken, options).finally(() => {
        if (activeLoadPromise === loadPromise) {
          activeLoadPromise = null;
          activeLoadAccessToken = null;
        }
      });

    activeLoadPromise = loadPromise;
    activeLoadAccessToken = accessToken;
    return loadPromise;
  }

  function queuePendingForcedRefresh(accessToken: string) {
    pendingForcedRefreshAccessToken = accessToken;
  }

  function runPendingForcedRefresh(
    accessToken: string,
    currentAccessToken: string,
  ): Promise<VocabularyRefreshResult> | undefined {
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
  ): Promise<VocabularyRefreshResult> | undefined {
    if (authState.status !== "authenticated" || !authState.accessToken) {
      return;
    }

    const vocabularyState = store.getSnapshot();

    if (activeLoadPromise && activeLoadAccessToken === authState.accessToken) {
      if (force) {
        queuePendingForcedRefresh(authState.accessToken);
      }

      return activeLoadPromise;
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
      return Promise.resolve("ignored");
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
const vocabularyRealtimeSync = createVocabularyRealtimeSync({
  refresh: (authState) => vocabularyAuthSync.refreshNow(authState),
});

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
  }, [authState]);
}

export function useRefreshVocabularyForActiveStudySurface(
  authState: AuthStateSnapshot,
  isStudySurfaceActive: boolean,
  refreshKey: unknown = isStudySurfaceActive,
) {
  useEffect(() => {
    if (!isStudySurfaceActive) {
      return;
    }

    vocabularyAuthSync.refresh(authState);
  }, [authState, isStudySurfaceActive, refreshKey]);

  useEffect(() => {
    if (!isStudySurfaceActive) {
      return;
    }

    const refreshVocabulary = () => {
      vocabularyAuthSync.refresh(authState);
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
  }, [authState, isStudySurfaceActive]);
}

export type VocabularyRefreshOptions = {
  force?: boolean;
};

export function refreshVocabularyForAuth(
  authState: AuthStateSnapshot,
  options?: VocabularyRefreshOptions,
) {
  return options?.force
    ? vocabularyAuthSync.refreshNow(authState)
    : vocabularyAuthSync.refresh(authState);
}

export function useSyncVocabularyRealtimeForAuth(authState: AuthStateSnapshot) {
  useEffect(() => {
    vocabularyRealtimeSync.sync(authState);

    return () => {
      void vocabularyRealtimeSync.cleanup();
    };
  }, [authState]);
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
