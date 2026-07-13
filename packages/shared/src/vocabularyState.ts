import type {
  VocabularyItem,
  VocabularyMeaning,
} from "./vocabularyContracts.ts";

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

export function removeVocabularyMeaningFromItems(
  items: VocabularyItem[],
  itemId: string,
  targetMeaning: VocabularyMeaning,
): VocabularyItem[] {
  const itemIndex = items.findIndex((item) => item.id === itemId);

  if (itemIndex === -1) {
    return items;
  }

  const item = items[itemIndex];

  if (!item) {
    return items;
  }

  const meaningIndex = item.meanings.findIndex((meaning) =>
    isSameVocabularyMeaning(meaning, targetMeaning),
  );

  if (meaningIndex === -1) {
    return items;
  }

  if (item.meanings.length === 1) {
    return items.filter((_, index) => index !== itemIndex);
  }

  const nextItems = [...items];
  nextItems[itemIndex] = {
    ...item,
    meanings: item.meanings.filter((_, index) => index !== meaningIndex),
  };
  return nextItems;
}

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

    removeMeaning(itemId: string, meaning: VocabularyMeaning) {
      const nextItems = removeVocabularyMeaningFromItems(
        snapshot.items,
        itemId,
        meaning,
      );

      if (nextItems === snapshot.items) {
        return;
      }

      setSnapshot({
        ...snapshot,
        items: nextItems,
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

function isSameVocabularyMeaning(
  candidate: VocabularyMeaning,
  target: VocabularyMeaning,
) {
  return (
    candidate.meaning === target.meaning &&
    (candidate.note ?? "") === (target.note ?? "") &&
    (!target.createdAt || candidate.createdAt === target.createdAt)
  );
}
