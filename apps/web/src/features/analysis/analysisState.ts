"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_ANALYSIS_MODEL_ID,
  analysisModelIdSchema,
  type AnalysisModelId,
} from "@nado/shared";
import {
  isAnalysisResultData,
  type VocabularySuggestionSaveState,
} from "@nado/ui";
import type { AnalyzeTextResult } from "./analysisApi";
import type { VocabularySaveNotice } from "./vocabularySaveNotice";

export type AnalysisState = AnalyzeTextResult | { status: "idle" | "loading" };

export type AnalysisPageSnapshot = {
  analysisState: AnalysisState;
  ownerUserId: string | null;
  selectedAnalysisModel: AnalysisModelId;
  text: string;
  vocabularySaveMessage: VocabularySaveNotice | null;
  vocabularySaveStates: Record<string, VocabularySuggestionSaveState>;
};

export type AnalysisStateStorage = Pick<
  Storage,
  "getItem" | "removeItem" | "setItem"
>;

export type AnalysisStateStoreOptions = {
  getModelStorage?: () => AnalysisStateStorage | null;
  getStorage?: () => AnalysisStateStorage | null;
};

export type AnalysisStateStore = ReturnType<typeof createAnalysisStateStore>;

const STORAGE_KEY = "nado.analysis-state.v1";
const MODEL_STORAGE_KEY = "nado.analysis-model.v1";
const STORAGE_VERSION = 2;

const initialSnapshot: AnalysisPageSnapshot = {
  analysisState: {
    status: "idle",
  },
  ownerUserId: null,
  selectedAnalysisModel: DEFAULT_ANALYSIS_MODEL_ID,
  text: "",
  vocabularySaveMessage: null,
  vocabularySaveStates: {},
};

export function createAnalysisStateStore(
  options: AnalysisStateStoreOptions = {},
) {
  const getStorage = options.getStorage ?? getSessionStorage;
  const getModelStorage = options.getModelStorage ?? getLocalStorage;
  const listeners = new Set<() => void>();
  let snapshot = initialSnapshot;
  let hasRestoredPersistedSnapshot = false;
  let persistedModel: AnalysisModelId | null = null;
  let pendingPersistedSnapshot: AnalysisPageSnapshot | null = null;

  const notify = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const persist = (nextSnapshot: AnalysisPageSnapshot) => {
    const storage = getStorage();

    if (!storage) {
      return;
    }

    try {
      storage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          snapshot: createPersistedSnapshot(nextSnapshot),
          version: STORAGE_VERSION,
        }),
      );
    } catch {
      storage.removeItem(STORAGE_KEY);
    }
  };

  const setSnapshot = (nextSnapshot: AnalysisPageSnapshot) => {
    snapshot = nextSnapshot;
    persist(nextSnapshot);
    notify();
  };

  const restorePersistedSnapshot = () => {
    if (hasRestoredPersistedSnapshot) {
      return;
    }

    hasRestoredPersistedSnapshot = true;

    const persistedSnapshot = readPersistedSnapshot(getStorage);
    persistedModel = readPersistedAnalysisModel(getModelStorage);

    pendingPersistedSnapshot = persistedSnapshot;

    if (persistedModel) {
      snapshot = {
        ...snapshot,
        selectedAnalysisModel: persistedModel,
      };
      notify();
    }
  };

  return {
    getSnapshot() {
      return snapshot;
    },

    getServerSnapshot() {
      return initialSnapshot;
    },

    reset() {
      pendingPersistedSnapshot = null;
      snapshot = {
        ...initialSnapshot,
        ownerUserId: snapshot.ownerUserId,
        selectedAnalysisModel: snapshot.selectedAnalysisModel,
      };
      getStorage()?.removeItem(STORAGE_KEY);
      notify();
    },

    syncUserScope(userId: string | null) {
      restorePersistedSnapshot();

      const persistedSnapshot = pendingPersistedSnapshot;
      pendingPersistedSnapshot = null;

      if (persistedSnapshot) {
        if (persistedSnapshot.ownerUserId === userId) {
          snapshot = {
            ...persistedSnapshot,
            selectedAnalysisModel:
              persistedModel ?? persistedSnapshot.selectedAnalysisModel,
          };
          notify();
          return;
        }

        getStorage()?.removeItem(STORAGE_KEY);
      }

      if (snapshot.ownerUserId === userId) {
        return;
      }

      setSnapshot({
        ...initialSnapshot,
        ownerUserId: userId,
        selectedAnalysisModel: snapshot.selectedAnalysisModel,
      });
    },

    setAnalysisState(analysisState: AnalysisState) {
      setSnapshot({
        ...snapshot,
        analysisState,
      });
    },

    setSelectedAnalysisModel(selectedAnalysisModel: AnalysisModelId) {
      persistSelectedAnalysisModel(selectedAnalysisModel, getModelStorage);
      setSnapshot({
        ...snapshot,
        selectedAnalysisModel,
      });
    },

    setText(text: string) {
      setSnapshot({
        ...snapshot,
        text,
      });
    },

    setVocabularySaveMessage(
      vocabularySaveMessage: VocabularySaveNotice | null,
    ) {
      setSnapshot({
        ...snapshot,
        vocabularySaveMessage,
      });
    },

    setVocabularySaveStates(
      update:
        | Record<string, VocabularySuggestionSaveState>
        | ((
            currentStates: Record<string, VocabularySuggestionSaveState>,
          ) => Record<string, VocabularySuggestionSaveState>),
    ) {
      setSnapshot({
        ...snapshot,
        vocabularySaveStates:
          typeof update === "function"
            ? update(snapshot.vocabularySaveStates)
            : update,
      });
    },

    subscribe(listener: () => void) {
      listeners.add(listener);
      restorePersistedSnapshot();

      return () => {
        listeners.delete(listener);
      };
    },
  };
}

const analysisStateStore = createAnalysisStateStore();

export function useAnalysisPageState() {
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

function readPersistedSnapshot(
  getStorage: () => AnalysisStateStorage | null,
): AnalysisPageSnapshot | null {
  const storage = getStorage();

  if (!storage) {
    return null;
  }

  try {
    const value = storage.getItem(STORAGE_KEY);

    if (!value) {
      return null;
    }

    const parsed = JSON.parse(value) as unknown;

    if (!isPersistedSnapshot(parsed)) {
      storage.removeItem(STORAGE_KEY);
      return null;
    }

    return createPersistedSnapshot(parsed.snapshot);
  } catch {
    storage.removeItem(STORAGE_KEY);
    return null;
  }
}

function createPersistedSnapshot(
  nextSnapshot: AnalysisPageSnapshot,
): AnalysisPageSnapshot {
  return {
    ...nextSnapshot,
    analysisState:
      nextSnapshot.analysisState.status === "loading"
        ? initialSnapshot.analysisState
        : nextSnapshot.analysisState,
    selectedAnalysisModel: isAnalysisModelId(nextSnapshot.selectedAnalysisModel)
      ? nextSnapshot.selectedAnalysisModel
      : DEFAULT_ANALYSIS_MODEL_ID,
    vocabularySaveMessage: null,
    vocabularySaveStates: {},
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

function readPersistedAnalysisModel(
  getStorage: () => AnalysisStateStorage | null,
): AnalysisModelId | null {
  const storage = getStorage();

  if (!storage) {
    return null;
  }

  try {
    const value = storage.getItem(MODEL_STORAGE_KEY);

    return isAnalysisModelId(value) ? value : null;
  } catch {
    return null;
  }
}

function persistSelectedAnalysisModel(
  selectedAnalysisModel: AnalysisModelId,
  getStorage: () => AnalysisStateStorage | null,
) {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(MODEL_STORAGE_KEY, selectedAnalysisModel);
  } catch {
    try {
      storage.removeItem(MODEL_STORAGE_KEY);
    } catch {
      // Storage can be disabled in private contexts. In-memory state remains usable.
    }
  }
}

function isPersistedSnapshot(value: unknown): value is {
  snapshot: AnalysisPageSnapshot;
  version: typeof STORAGE_VERSION;
} {
  return (
    isRecord(value) &&
    value.version === STORAGE_VERSION &&
    isAnalysisPageSnapshot(value.snapshot)
  );
}

function isAnalysisPageSnapshot(value: unknown): value is AnalysisPageSnapshot {
  return (
    isRecord(value) &&
    typeof value.text === "string" &&
    (value.ownerUserId === null || typeof value.ownerUserId === "string") &&
    isAnalysisState(value.analysisState) &&
    (value.selectedAnalysisModel === undefined ||
      isAnalysisModelId(value.selectedAnalysisModel)) &&
    (value.vocabularySaveMessage === null ||
      isVocabularySaveNotice(value.vocabularySaveMessage)) &&
    isVocabularySaveStates(value.vocabularySaveStates)
  );
}

function isAnalysisState(value: unknown): value is AnalysisState {
  return (
    isRecord(value) &&
    (value.status === "idle" ||
      value.status === "loading" ||
      value.status === "error" ||
      value.status === "not_analyzable" ||
      (value.status === "success" && isAnalysisResultData(value.data)))
  );
}

function isVocabularySaveStates(
  value: unknown,
): value is Record<string, VocabularySuggestionSaveState> {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (state) => state === "idle" || state === "saved" || state === "saving",
    )
  );
}

function isVocabularySaveNotice(value: unknown): value is VocabularySaveNotice {
  return (
    isRecord(value) &&
    typeof value.text === "string" &&
    (value.tone === "error" || value.tone === "success")
  );
}

function isAnalysisModelId(value: unknown): value is AnalysisModelId {
  return analysisModelIdSchema.safeParse(value).success;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
