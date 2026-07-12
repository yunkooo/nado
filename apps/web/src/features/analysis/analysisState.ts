"use client";

import { useSyncExternalStore } from "react";
import {
  createAnalysisStateStoreCore,
  type AnalysisPageSnapshot,
  type AnalysisStateStorage,
} from "@nado/shared/analysis-state";

export type {
  AnalysisPageSnapshot,
  AnalysisState,
  AnalysisStateStorage,
} from "@nado/shared/analysis-state";

export type AnalysisStateStoreOptions = {
  getModelStorage?: () => AnalysisStateStorage | null;
  getStorage?: () => AnalysisStateStorage | null;
};

export type AnalysisStateStore = ReturnType<typeof createAnalysisStateStore>;

const STORAGE_KEY = "nado.analysis-state.v1";
const MODEL_STORAGE_KEY = "nado.analysis-model.v1";

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
