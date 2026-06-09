import { useSyncExternalStore } from "react";
import type { VocabularySuggestionSaveState } from "@nado/ui";
import type { AnalyzeTextResult } from "./analysisApi";

export type AnalysisState = AnalyzeTextResult | { status: "idle" | "loading" };

export type VocabularySaveNotice = {
  text: string;
  tone: "error" | "success";
};

export type AnalysisPageSnapshot = {
  analysisState: AnalysisState;
  text: string;
  vocabularySaveMessage: VocabularySaveNotice | null;
  vocabularySaveStates: Record<string, VocabularySuggestionSaveState>;
};

export type AnalysisStateStorage = Pick<
  Storage,
  "getItem" | "removeItem" | "setItem"
>;

export type AnalysisStateStoreOptions = {
  getStorage?: () => AnalysisStateStorage | null;
};

const STORAGE_KEY = "nado.desktop.analysis.v1";
const STORAGE_VERSION = 1;

const initialSnapshot: AnalysisPageSnapshot = {
  analysisState: {
    status: "idle",
  },
  text: "",
  vocabularySaveMessage: null,
  vocabularySaveStates: {},
};

export function createAnalysisStateStore(
  options: AnalysisStateStoreOptions = {},
) {
  const getStorage = options.getStorage ?? getSessionStorage;
  const listeners = new Set<() => void>();
  let snapshot = initialSnapshot;
  let hasRestoredPersistedSnapshot = false;

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
          snapshot: nextSnapshot,
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

    if (!persistedSnapshot) {
      return;
    }

    snapshot = persistedSnapshot;
    notify();
  };

  return {
    getSnapshot() {
      return snapshot;
    },

    getServerSnapshot() {
      return initialSnapshot;
    },

    reset() {
      snapshot = initialSnapshot;
      getStorage()?.removeItem(STORAGE_KEY);
      notify();
    },

    setAnalysisState(analysisState: AnalysisState) {
      setSnapshot({
        ...snapshot,
        analysisState,
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

    return parsed.snapshot;
  } catch {
    storage.removeItem(STORAGE_KEY);
    return null;
  }
}

function getSessionStorage(): AnalysisStateStorage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage;
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
    isAnalysisState(value.analysisState) &&
    (value.vocabularySaveMessage === null ||
      isVocabularySaveNotice(value.vocabularySaveMessage)) &&
    isRecord(value.vocabularySaveStates)
  );
}

function isAnalysisState(value: unknown): value is AnalysisState {
  return (
    isRecord(value) &&
    (value.status === "idle" ||
      value.status === "loading" ||
      value.status === "error" ||
      value.status === "not_analyzable" ||
      (value.status === "success" && isRecord(value.data)))
  );
}

function isVocabularySaveNotice(value: unknown): value is VocabularySaveNotice {
  return (
    isRecord(value) &&
    typeof value.text === "string" &&
    (value.tone === "error" || value.tone === "success")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
