export type VocabularyPanelState = "empty" | "error" | "list" | "loading";

export type VocabularyPanelStateInput = {
  isLoading: boolean;
  itemCount: number;
  message: string | null;
};

export function getVocabularyPanelState({
  isLoading,
  itemCount,
  message,
}: VocabularyPanelStateInput): VocabularyPanelState {
  if (isLoading) {
    return "loading";
  }

  if (message) {
    return "error";
  }

  if (itemCount === 0) {
    return "empty";
  }

  return "list";
}
