import type { VocabularyItem } from "./vocabularyContracts.ts";

export type VocabularyStateStatus = "idle" | "loading" | "ready" | "error";

export type VocabularyStateSnapshot = {
  accessToken: string | null;
  items: VocabularyItem[];
  message: string | null;
  status: VocabularyStateStatus;
};

export type VocabularyStateStore = ReturnType<
  typeof createVocabularyStateStore
>;

export const initialVocabularyStateSnapshot: VocabularyStateSnapshot = {
  accessToken: null,
  items: [],
  message: null,
  status: "idle",
};

export function createVocabularyStateStore() {
  const listeners = new Set<() => void>();
  let snapshot = initialVocabularyStateSnapshot;

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
      setSnapshot(initialVocabularyStateSnapshot);
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
      setSnapshot({
        ...snapshot,
        items: [
          item,
          ...snapshot.items.filter((currentItem) => currentItem.id !== item.id),
        ],
      });
    },
  };
}
