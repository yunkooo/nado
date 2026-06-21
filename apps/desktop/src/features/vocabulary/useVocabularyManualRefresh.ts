import {
  shouldStartVocabularyManualRefresh,
  VOCABULARY_MANUAL_REFRESH_THROTTLE_MS,
} from "@nado/shared";
import { useEffect, useRef, useState } from "react";
import type { AuthStateSnapshot } from "../../auth/authState";
import {
  refreshVocabularyForAuth,
  useVocabularyState,
} from "./vocabularyState";

const REFRESH_ERROR_MESSAGE = "단어장을 새로고침하지 못했어요.";

type VocabularyManualRefreshStatus = "error" | "idle" | "refreshing";

export function useVocabularyManualRefresh(authState: AuthStateSnapshot) {
  const vocabularyState = useVocabularyState();
  const isRefreshInFlightRef = useRef(false);
  const lastManualRefreshStartedAtRef = useRef<number | undefined>(undefined);
  const [status, setStatus] = useState<VocabularyManualRefreshStatus>("idle");
  const isRefreshing = status === "refreshing";
  const isDisabled =
    isRefreshing ||
    vocabularyState.status === "loading" ||
    authState.status !== "authenticated" ||
    !authState.accessToken;

  useEffect(() => {
    isRefreshInFlightRef.current = false;
    lastManualRefreshStartedAtRef.current = undefined;
    setStatus("idle");
  }, [authState.accessToken, authState.status]);

  const refreshVocabulary = async () => {
    if (isDisabled) {
      return;
    }

    const now = Date.now();

    if (
      !shouldStartVocabularyManualRefresh({
        isRefreshing: isRefreshInFlightRef.current,
        lastStartedAt: lastManualRefreshStartedAtRef.current,
        now,
        throttleMs: VOCABULARY_MANUAL_REFRESH_THROTTLE_MS,
      })
    ) {
      return;
    }

    isRefreshInFlightRef.current = true;
    lastManualRefreshStartedAtRef.current = now;
    setStatus("refreshing");

    try {
      const result = await refreshVocabularyForAuth(authState, { force: true });
      setStatus(result === "failed" ? "error" : "idle");
    } finally {
      isRefreshInFlightRef.current = false;
    }
  };

  return {
    isDisabled,
    isRefreshing,
    message: status === "error" ? REFRESH_ERROR_MESSAGE : null,
    refreshVocabulary,
  };
}
