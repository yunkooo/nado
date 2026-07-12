import type { AnalysisModelId } from "./analysisInput.ts";
import type { VocabularySuggestionSaveState } from "./analysisPresentation.ts";
import {
  createInitialAnalysisPageSnapshot,
  type AnalysisPageSnapshot,
  type AnalysisRequestScope,
  type AnalysisState,
  type AnalysisStateStorage,
  type VocabularySaveNotice,
} from "./analysisStateContracts.ts";
import {
  persistAnalysisPageSnapshot,
  persistSelectedAnalysisModel,
  readAnalysisStorage,
  readPersistedAnalysisModel,
  readPersistedAnalysisPageSnapshot,
  removeAnalysisStorageItem,
} from "./analysisStatePersistence.ts";

export {
  createInitialAnalysisPageSnapshot,
  createPersistedAnalysisPageSnapshot,
  isAnalysisPageSnapshot,
  type AnalysisClientError,
  type AnalysisClientResult,
  type AnalysisPageSnapshot,
  type AnalysisRequestScope,
  type AnalysisState,
  type AnalysisStateStorage,
  type VocabularySaveNotice,
} from "./analysisStateContracts.ts";

export type AnalysisStateStoreCoreOptions = {
  getModelStorage?: () => AnalysisStateStorage | null;
  getStorage?: () => AnalysisStateStorage | null;
  modelStorageKey: string;
  storageKey: string;
};

export function createAnalysisStateStoreCore({
  getModelStorage = getUnavailableStorage,
  getStorage = getUnavailableStorage,
  modelStorageKey,
  storageKey,
}: AnalysisStateStoreCoreOptions) {
  const initialSnapshot = createInitialAnalysisPageSnapshot();
  const listeners = new Set<() => void>();
  let snapshot = initialSnapshot;
  let analysisRequestSequence = 0;
  let hasRestoredPersistedSnapshot = false;
  let persistedModel: AnalysisModelId | null = null;
  let pendingPersistedSnapshot: AnalysisPageSnapshot | null = null;

  const notify = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const setSnapshot = (nextSnapshot: AnalysisPageSnapshot) => {
    snapshot = nextSnapshot;
    persistAnalysisPageSnapshot(nextSnapshot, getStorage, storageKey);
    notify();
  };

  const restorePersistedSnapshot = () => {
    if (hasRestoredPersistedSnapshot) {
      return;
    }

    hasRestoredPersistedSnapshot = true;
    pendingPersistedSnapshot = readPersistedAnalysisPageSnapshot(
      getStorage,
      storageKey,
    );
    persistedModel = readPersistedAnalysisModel(
      getModelStorage,
      modelStorageKey,
    );

    if (persistedModel) {
      snapshot = {
        ...snapshot,
        selectedAnalysisModel: persistedModel,
      };
      notify();
    }
  };

  return {
    beginAnalysisRequest(userId: string | null): AnalysisRequestScope | null {
      if (snapshot.ownerUserId !== userId) {
        return null;
      }

      analysisRequestSequence += 1;

      return {
        requestId: analysisRequestSequence,
        userId,
      };
    },

    getSnapshot() {
      return snapshot;
    },

    getServerSnapshot() {
      return initialSnapshot;
    },

    isAnalysisRequestCurrent(request: AnalysisRequestScope) {
      return (
        request.requestId === analysisRequestSequence &&
        request.userId === snapshot.ownerUserId
      );
    },

    isUserScopeCurrent(userId: string | null) {
      return snapshot.ownerUserId === userId;
    },

    reset() {
      analysisRequestSequence += 1;
      pendingPersistedSnapshot = null;
      snapshot = {
        ...initialSnapshot,
        ownerUserId: snapshot.ownerUserId,
        selectedAnalysisModel: snapshot.selectedAnalysisModel,
      };
      removeAnalysisStorageItem(readAnalysisStorage(getStorage), storageKey);
      notify();
    },

    setAnalysisState(analysisState: AnalysisState) {
      setSnapshot({
        ...snapshot,
        analysisState,
      });
    },

    setSelectedAnalysisModel(selectedAnalysisModel: AnalysisModelId) {
      persistSelectedAnalysisModel(
        selectedAnalysisModel,
        getModelStorage,
        modelStorageKey,
      );
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

    syncUserScope(userId: string | null) {
      restorePersistedSnapshot();

      const persistedSnapshot = pendingPersistedSnapshot;
      pendingPersistedSnapshot = null;

      if (persistedSnapshot) {
        if (persistedSnapshot.ownerUserId === userId) {
          if (snapshot.ownerUserId !== userId) {
            analysisRequestSequence += 1;
          }

          snapshot = {
            ...persistedSnapshot,
            selectedAnalysisModel:
              persistedModel ?? persistedSnapshot.selectedAnalysisModel,
          };
          notify();
          return;
        }

        removeAnalysisStorageItem(readAnalysisStorage(getStorage), storageKey);
      }

      if (snapshot.ownerUserId === userId) {
        return;
      }

      analysisRequestSequence += 1;
      setSnapshot({
        ...initialSnapshot,
        ownerUserId: userId,
        selectedAnalysisModel: snapshot.selectedAnalysisModel,
      });
    },
  };
}

export type AnalysisStateStoreCore = ReturnType<
  typeof createAnalysisStateStoreCore
>;

function getUnavailableStorage() {
  return null;
}
