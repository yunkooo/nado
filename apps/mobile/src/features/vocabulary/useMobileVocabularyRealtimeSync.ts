import { useEffect, useRef } from "react";
import { getMobileSupabaseClient } from "../../auth/authClient";
import type { MobileAuthStateSnapshot } from "../../auth/authState";
import {
  createMobileVocabularyRealtimeSync,
  type MobileVocabularyRealtimeClient,
} from "./mobileVocabularyRealtime";
import type { MobileVocabularyRefreshResult } from "./mobileVocabularyLoadCoordinator";

type RefreshVocabularyInBackground = (options?: {
  force?: boolean;
}) => Promise<MobileVocabularyRefreshResult>;

export function useMobileVocabularyRealtimeSync({
  authState,
  refreshVocabularyInBackground,
}: {
  authState: MobileAuthStateSnapshot;
  refreshVocabularyInBackground: RefreshVocabularyInBackground;
}) {
  const latestRefreshRef = useRef(refreshVocabularyInBackground);
  const realtimeSyncRef = useRef<
    ReturnType<typeof createMobileVocabularyRealtimeSync> | undefined
  >(undefined);
  latestRefreshRef.current = refreshVocabularyInBackground;

  if (!realtimeSyncRef.current) {
    realtimeSyncRef.current = createMobileVocabularyRealtimeSync({
      getClient: () =>
        getMobileSupabaseClient() as MobileVocabularyRealtimeClient | null,
      refresh: () => latestRefreshRef.current({ force: true }),
    });
  }

  useEffect(() => {
    const realtimeSync = realtimeSyncRef.current;

    if (!realtimeSync) {
      return;
    }

    realtimeSync.sync(authState);

    return () => {
      void realtimeSync.cleanup();
    };
  }, [authState]);
}
