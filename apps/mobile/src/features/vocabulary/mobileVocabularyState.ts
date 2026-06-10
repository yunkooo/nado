import type { VocabularyItem } from "@nado/shared";

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
