import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  shouldRefreshVocabularyFromLifecycle,
  VOCABULARY_LIFECYCLE_REFRESH_STALE_MS,
} from "@nado/shared/vocabulary-realtime";
import {
  createVocabularyStateStore,
  initialVocabularyStateSnapshot,
  type VocabularyStateSnapshot,
  type VocabularyStateStatus,
  type VocabularyStateStore,
} from "@nado/shared/vocabulary-state";
import type { AuthStateSnapshot } from "../../auth/authState";
import {
  listVocabulary,
  VOCABULARY_ERROR_MESSAGE,
  type VocabularyListResult,
} from "../../api/vocabularyApi";
import { createVocabularyRealtimeSync } from "./vocabularyRealtime";

export { createVocabularyStateStore };
export type { VocabularyStateSnapshot, VocabularyStateStatus };
export type VocabularyRefreshResult = "failed" | "ignored" | "refreshed";
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
  let activeRefresh: {
    accessToken: string;
    promise: Promise<VocabularyRefreshResult>;
  } | null = null;
  let pendingForcedRefreshAccessToken: string | null = null;
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

  function startRefresh(
    accessToken: string,
    options: { showLoading: boolean },
  ): Promise<VocabularyRefreshResult> {
    const refreshPromise: Promise<VocabularyRefreshResult> = (async () => {
      const result = await loadVocabularyForSession(accessToken, options);

      if (pendingForcedRefreshAccessToken !== accessToken) {
        return result;
      }

      pendingForcedRefreshAccessToken = null;

      if (store.getSnapshot().accessToken !== accessToken) {
        return result;
      }

      return startRefresh(accessToken, { showLoading: false });
    })().finally(() => {
      if (activeRefresh?.promise === refreshPromise) {
        activeRefresh = null;
      }
    });

    activeRefresh = { accessToken, promise: refreshPromise };
    return refreshPromise;
  }

  function refresh(
    authState: AuthStateSnapshot,
    { force = false }: { force?: boolean } = {},
  ): Promise<VocabularyRefreshResult> {
    if (authState.status !== "authenticated" || !authState.accessToken) {
      return Promise.resolve("ignored");
    }

    if (activeRefresh?.accessToken === authState.accessToken) {
      if (force) {
        pendingForcedRefreshAccessToken = authState.accessToken;
      }

      return activeRefresh.promise;
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

    const showLoading =
      vocabularyState.accessToken !== authState.accessToken ||
      vocabularyState.status !== "ready";

    return startRefresh(authState.accessToken, {
      showLoading,
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
        activeRefresh = null;
        pendingForcedRefreshAccessToken = null;
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
const vocabularyRealtimeSync = createVocabularyRealtimeSync({
  refresh: (authState) => vocabularyAuthSync.refreshAfterCurrentLoad(authState),
});

export type VocabularyRefreshOptions = {
  force?: boolean;
};

export function refreshVocabularyForAuth(
  authState: AuthStateSnapshot,
  options?: VocabularyRefreshOptions,
) {
  return vocabularyAuthSync.refresh(authState, options);
}

export function useSyncVocabularyForAuth(authState: AuthStateSnapshot) {
  useEffect(() => {
    vocabularyAuthSync.sync(authState);
  }, [authState]);
}

export function useSyncVocabularyRealtimeForAuth(authState: AuthStateSnapshot) {
  useEffect(() => {
    vocabularyRealtimeSync.sync(authState);

    return () => {
      void vocabularyRealtimeSync.cleanup();
    };
  }, [authState]);
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
  }, [authState, isStudySurfaceActive, refreshKey]);

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
