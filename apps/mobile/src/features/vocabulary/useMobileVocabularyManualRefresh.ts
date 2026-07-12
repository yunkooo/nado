import { useCallback, useEffect, useRef, useState } from "react";
import {
  shouldStartVocabularyManualRefresh,
  VOCABULARY_MANUAL_REFRESH_THROTTLE_MS,
} from "@nado/shared/vocabulary-realtime";
import type { MobileAuthStateSnapshot } from "../../auth/authState";

type RefreshVocabularyInBackground = (options?: {
  force?: boolean;
}) => Promise<void> | undefined;

export function useMobileVocabularyManualRefresh({
  authState,
  refreshVocabularyInBackground,
}: {
  authState: MobileAuthStateSnapshot;
  refreshVocabularyInBackground: RefreshVocabularyInBackground;
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isRefreshingRef = useRef(false);
  const lastStartedAtRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (
      authState.status === "loading" ||
      (authState.status === "authenticated" && authState.accessToken)
    ) {
      return;
    }

    lastStartedAtRef.current = undefined;
    isRefreshingRef.current = false;
    setIsRefreshing(false);
  }, [authState.accessToken, authState.session?.user.id, authState.status]);

  const refreshVocabulary = useCallback(async () => {
    const now = Date.now();

    if (
      !shouldStartVocabularyManualRefresh({
        isRefreshing: isRefreshingRef.current,
        lastStartedAt: lastStartedAtRef.current,
        now,
        throttleMs: VOCABULARY_MANUAL_REFRESH_THROTTLE_MS,
      })
    ) {
      return;
    }

    const refreshPromise = refreshVocabularyInBackground({ force: true });

    if (!refreshPromise) {
      return;
    }

    isRefreshingRef.current = true;
    lastStartedAtRef.current = now;
    setIsRefreshing(true);

    try {
      await refreshPromise;
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, [refreshVocabularyInBackground]);

  return { isRefreshing, refreshVocabulary };
}
