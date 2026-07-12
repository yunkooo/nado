import type { VocabularyItem } from "@nado/shared/vocabulary";

export type MobileVocabularyState = {
  items: VocabularyItem[];
  message: string | null;
  status: "idle" | "loading" | "ready" | "error";
};

export function applyDeleteVocabularyError(
  currentState: MobileVocabularyState,
  message: string,
): MobileVocabularyState {
  return {
    ...currentState,
    message,
    status: currentState.items.length > 0 ? "ready" : "error",
  };
}

export function applyLoadVocabularyError(
  currentState: MobileVocabularyState,
  {
    message,
    preserveCurrentOnError,
  }: {
    message: string;
    preserveCurrentOnError: boolean;
  },
): MobileVocabularyState {
  if (
    preserveCurrentOnError &&
    (currentState.status === "ready" || currentState.items.length > 0)
  ) {
    return {
      ...currentState,
      message,
      status: "ready",
    };
  }

  return {
    items: [],
    message,
    status: "error",
  };
}

export function upsertMobileVocabularyItem(
  currentState: MobileVocabularyState,
  item: VocabularyItem,
): MobileVocabularyState {
  return {
    ...currentState,
    items: [
      item,
      ...currentState.items.filter((currentItem) => currentItem.id !== item.id),
    ],
    message: null,
    status: "ready",
  };
}

export function addMobileVocabularySavingKey(
  savingKeys: ReadonlySet<string>,
  key: string,
) {
  return new Set([...savingKeys, key]);
}

export function addMobileVocabularyDeletingId(
  deletingIds: ReadonlySet<string>,
  itemId: string,
) {
  return new Set([...deletingIds, itemId]);
}

export function addMobileVocabularyDeletingKey(
  deletingKeys: ReadonlySet<string>,
  key: string,
) {
  return new Set([...deletingKeys, key]);
}

export function removeMobileVocabularyDeletingId(
  deletingIds: ReadonlySet<string>,
  itemId: string,
) {
  const nextIds = new Set(deletingIds);
  nextIds.delete(itemId);
  return nextIds;
}

export function removeMobileVocabularyDeletingKey(
  deletingKeys: ReadonlySet<string>,
  key: string,
) {
  const nextKeys = new Set(deletingKeys);
  nextKeys.delete(key);
  return nextKeys;
}

export function removeMobileVocabularySavingKey(
  savingKeys: ReadonlySet<string>,
  key: string,
) {
  const nextKeys = new Set(savingKeys);
  nextKeys.delete(key);
  return nextKeys;
}
