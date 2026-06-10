import { useEffect, useState } from "react";
import type { AuthStateSnapshot } from "../../auth/authState";
import {
  refreshVocabularyForAuth,
  useVocabularyState,
} from "./vocabularyState";

const REFRESH_ERROR_MESSAGE = "단어장을 새로고침하지 못했어요.";

type VocabularyManualRefreshStatus = "error" | "idle" | "refreshing";

export function useVocabularyManualRefresh(authState: AuthStateSnapshot) {
  const vocabularyState = useVocabularyState();
  const [status, setStatus] = useState<VocabularyManualRefreshStatus>("idle");
  const isRefreshing = status === "refreshing";
  const isDisabled =
    isRefreshing ||
    vocabularyState.status === "loading" ||
    authState.status !== "authenticated" ||
    !authState.accessToken;

  useEffect(() => {
    setStatus("idle");
  }, [authState.accessToken, authState.status]);

  const refreshVocabulary = async () => {
    if (isDisabled) {
      return;
    }

    setStatus("refreshing");
    const result = await refreshVocabularyForAuth(authState);
    setStatus(result === "failed" ? "error" : "idle");
  };

  return {
    isDisabled,
    isRefreshing,
    message: status === "error" ? REFRESH_ERROR_MESSAGE : null,
    refreshVocabulary,
  };
}
