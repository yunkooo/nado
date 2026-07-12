import {
  createVocabularyRealtimeController,
  type VocabularyRealtimeClient as SharedVocabularyRealtimeClient,
  type VocabularyRealtimeRefreshSchedulerFactory,
  type VocabularyRealtimeRetryTimers,
} from "@nado/shared/vocabulary-realtime";
import type { MobileAuthStateSnapshot } from "../../auth/authState";

export type MobileVocabularyRealtimeClient = SharedVocabularyRealtimeClient;

type CreateMobileVocabularyRealtimeSyncOptions = {
  createRefreshScheduler?: VocabularyRealtimeRefreshSchedulerFactory;
  getClient: () => MobileVocabularyRealtimeClient | null;
  refresh: (authState: MobileAuthStateSnapshot) => Promise<unknown> | unknown;
  retryMs?: number;
  retryTimers?: VocabularyRealtimeRetryTimers<ReturnType<typeof setTimeout>>;
};

export function createMobileVocabularyRealtimeSync({
  createRefreshScheduler,
  getClient,
  refresh,
  retryMs,
  retryTimers,
}: CreateMobileVocabularyRealtimeSyncOptions) {
  return createVocabularyRealtimeController<MobileAuthStateSnapshot>({
    createRefreshScheduler,
    getClient,
    getConnection: (authState) => {
      const userId = authState.session?.user.id;

      if (
        authState.status !== "authenticated" ||
        !authState.accessToken ||
        !userId
      ) {
        return null;
      }

      return {
        accessToken: authState.accessToken,
        userId,
      };
    },
    refresh,
    retryMs,
    retryTimers,
  });
}
