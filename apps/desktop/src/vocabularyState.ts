import { useEffect, useSyncExternalStore } from "react";
import { normalizeVocabularyTerm, type VocabularyItem } from "@nado/shared";
import type { AuthStateSnapshot } from "./authState";
import { listVocabulary } from "./vocabularyApi";

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

export function useSyncVocabularyForAuth(authState: AuthStateSnapshot) {
  useEffect(() => {
    let isCurrent = true;

    async function loadVocabularyForSession(accessToken: string) {
      vocabularyStateStore.setLoading(accessToken);

      const result = await listVocabulary(accessToken);

      if (!isCurrent) {
        return;
      }

      if (result.status === "success") {
        vocabularyStateStore.setReady(accessToken, result.data);
        return;
      }

      vocabularyStateStore.setError(accessToken, result.message);
    }

    if (authState.status === "loading") {
      return () => {
        isCurrent = false;
      };
    }

    if (authState.status !== "authenticated" || !authState.accessToken) {
      vocabularyStateStore.reset();
      return () => {
        isCurrent = false;
      };
    }

    const vocabularyState = vocabularyStateStore.getSnapshot();

    if (
      !shouldLoadVocabularyForSession(vocabularyState, authState.accessToken)
    ) {
      return () => {
        isCurrent = false;
      };
    }

    void loadVocabularyForSession(authState.accessToken);

    return () => {
      isCurrent = false;
    };
  }, [authState.accessToken, authState.status]);
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
  const suggestionNote = suggestion.note?.trim() ?? "";

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
        (meaning.note?.trim() ?? "") === suggestionNote,
    );
  });
}
