import {
  shouldStartVocabularyManualRefresh,
  VOCABULARY_MANUAL_REFRESH_THROTTLE_MS,
} from "@nado/shared/vocabulary-realtime";
import { useEffect, useRef, useState } from "react";
import type { AuthStateSnapshot } from "../auth/authState";
import {
  refreshVocabularyForAuth,
  useVocabularyState,
} from "./vocabularyState";

const REFRESH_ERROR_MESSAGE = "단어장을 새로고침하지 못했어요.";

type VocabularyManualRefreshStatus = "error" | "idle" | "refreshing";

type VocabularyManualRefreshState = {
  accessToken: string | null;
  status: VocabularyManualRefreshStatus;
};

export function useVocabularyManualRefresh(authState: AuthStateSnapshot) {
  const vocabularyState = useVocabularyState();
  const currentAccessTokenRef = useRef(authState.accessToken);
  const isRefreshInFlightRef = useRef(false);
  const lastManualRefreshStartedAtRef = useRef<number | undefined>(undefined);
  const [refreshState, setRefreshState] =
    useState<VocabularyManualRefreshState>({
      accessToken: null,
      status: "idle",
    });
  const status =
    refreshState.accessToken === authState.accessToken
      ? refreshState.status
      : "idle";
  const isRefreshing = status === "refreshing";
  const isDisabled =
    isRefreshing ||
    vocabularyState.status === "loading" ||
    authState.status !== "authenticated" ||
    !authState.accessToken;

  useEffect(() => {
    currentAccessTokenRef.current = authState.accessToken;
    isRefreshInFlightRef.current = false;
    lastManualRefreshStartedAtRef.current = undefined;
  }, [authState.accessToken, authState.status]);

  const refreshVocabulary = async () => {
    if (isDisabled) {
      return;
    }

    const accessToken = authState.accessToken;

    if (!accessToken) {
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
    setRefreshState({ accessToken, status: "refreshing" });

    try {
      const result = await refreshVocabularyForAuth(authState, { force: true });

      if (currentAccessTokenRef.current === accessToken) {
        setRefreshState({
          accessToken,
          status: result === "failed" ? "error" : "idle",
        });
      }
    } finally {
      if (currentAccessTokenRef.current === accessToken) {
        isRefreshInFlightRef.current = false;
      }
    }
  };

  return {
    isDisabled,
    isRefreshing,
    message: status === "error" ? REFRESH_ERROR_MESSAGE : null,
    refreshVocabulary,
  };
}
