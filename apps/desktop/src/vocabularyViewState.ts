import type { AuthStateStatus } from "./authState";

export type VocabularyPanelState =
  | "auth_required"
  | "empty"
  | "error"
  | "list"
  | "loading";

export type VocabularyPanelStateInput = {
  authStatus: AuthStateStatus;
  isLoading: boolean;
  itemCount: number;
  message: string | null;
};

export function getVocabularyPanelState({
  authStatus,
  isLoading,
  itemCount,
  message,
}: VocabularyPanelStateInput): VocabularyPanelState {
  if (isLoading || authStatus === "loading") {
    return "loading";
  }

  if (authStatus !== "authenticated") {
    return "auth_required";
  }

  if (message) {
    return "error";
  }

  if (itemCount === 0) {
    return "empty";
  }

  return "list";
}
