import type { AuthStateStatus } from "../../auth/authState";
import type { VocabularyStateStatus } from "./vocabularyState";

export type VocabularyPanelState =
  | "auth_loading"
  | "auth_required"
  | "empty"
  | "error"
  | "list"
  | "vocabulary_loading";

export type VocabularyPanelStateInput = {
  authStatus: AuthStateStatus;
  itemCount: number;
  message: string | null;
  vocabularyStatus: VocabularyStateStatus;
};

export function getVocabularyPanelState({
  authStatus,
  itemCount,
  message,
  vocabularyStatus,
}: VocabularyPanelStateInput): VocabularyPanelState {
  if (authStatus === "loading") {
    return itemCount > 0 ? "list" : "auth_loading";
  }

  if (authStatus !== "authenticated") {
    return "auth_required";
  }

  if (vocabularyStatus === "loading") {
    return itemCount > 0 ? "list" : "vocabulary_loading";
  }

  if (message) {
    return "error";
  }

  if (itemCount === 0) {
    return "empty";
  }

  return "list";
}
