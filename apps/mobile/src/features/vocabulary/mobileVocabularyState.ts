import type { VocabularyItem } from "@nado/shared";
import type { MobileVocabularySuggestion } from "../../api/analysisApi";

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

export function createMobileVocabularySuggestionKey(
  suggestion: MobileVocabularySuggestion,
) {
  return `${suggestion.type}:${suggestion.term}:${suggestion.meaning}`;
}

export function isMobileVocabularySuggestionSaved(
  items: VocabularyItem[],
  suggestion: MobileVocabularySuggestion,
) {
  const normalizedSuggestionTerm = normalizeVocabularyTerm(suggestion.term);

  return items.some((item) => {
    return (
      item.type === suggestion.type &&
      normalizeVocabularyTerm(item.term) === normalizedSuggestionTerm
    );
  });
}

function normalizeVocabularyTerm(term: string) {
  return term.trim().toLocaleLowerCase();
}
