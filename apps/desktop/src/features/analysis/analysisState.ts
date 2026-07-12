import { useEffect, useSyncExternalStore } from "react";
import {
  createAnalysisStateStoreCore,
  type AnalysisPageSnapshot,
  type AnalysisStateStorage,
} from "@nado/shared/analysis-state";

export type {
  AnalysisPageSnapshot,
  AnalysisRequestScope,
  AnalysisState,
  AnalysisStateStorage,
  VocabularySaveNotice,
} from "@nado/shared/analysis-state";

export type AnalysisStateStoreOptions = {
  getModelStorage?: () => AnalysisStateStorage | null;
  getStorage?: () => AnalysisStateStorage | null;
};

export type AnalysisStateStore = ReturnType<typeof createAnalysisStateStore>;

const STORAGE_KEY = "nado.desktop.analysis.v1";
const MODEL_STORAGE_KEY = "nado.desktop.analysis-model.v1";

export function createAnalysisStateStore(
  options: AnalysisStateStoreOptions = {},
) {
  return createAnalysisStateStoreCore({
    getModelStorage: options.getModelStorage ?? getLocalStorage,
    getStorage: options.getStorage ?? getSessionStorage,
    modelStorageKey: MODEL_STORAGE_KEY,
    storageKey: STORAGE_KEY,
  });
}

const analysisStateStore = createAnalysisStateStore();

export function useAnalysisPageState(): {
  snapshot: AnalysisPageSnapshot;
  store: AnalysisStateStore;
} {
  const snapshot = useSyncExternalStore(
    analysisStateStore.subscribe,
    analysisStateStore.getSnapshot,
    analysisStateStore.getServerSnapshot,
  );

  return {
    snapshot,
    store: analysisStateStore,
  };
}

export function useSyncAnalysisUserScope(
  userId: string | null,
  isAuthLoading: boolean,
) {
  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    analysisStateStore.syncUserScope(userId);
  }, [isAuthLoading, userId]);
}

function getSessionStorage(): AnalysisStateStorage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage;
}

function getLocalStorage(): AnalysisStateStorage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}
