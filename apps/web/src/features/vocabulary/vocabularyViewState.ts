import type { AuthStateStatus } from "../auth/authState";

export type VocabularyPanelState =
  | "auth_required"
  | "auth_loading"
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
  if (authStatus === "loading") {
    return "auth_loading";
  }

  if (isLoading) {
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
