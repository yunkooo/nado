import {
  createVocabularyRealtimeController,
  type VocabularyRealtimeClient as SharedVocabularyRealtimeClient,
  type VocabularyRealtimeRefreshSchedulerFactory as SharedVocabularyRealtimeRefreshSchedulerFactory,
  type VocabularyRealtimeRetryTimers,
} from "@nado/shared/vocabulary-realtime";
import { getSupabaseBrowserClient } from "../../auth/authClient";
import type { AuthStateSnapshot } from "../../auth/authState";

export type VocabularyRealtimeClient = SharedVocabularyRealtimeClient;
export type VocabularyRealtimeRefreshSchedulerFactory =
  SharedVocabularyRealtimeRefreshSchedulerFactory;

type CreateVocabularyRealtimeSyncOptions = {
  createRefreshScheduler?: VocabularyRealtimeRefreshSchedulerFactory;
  getClient?: () => VocabularyRealtimeClient | null;
  refresh: (authState: AuthStateSnapshot) => Promise<unknown> | unknown;
  retryMs?: number;
  retryTimers?: VocabularyRealtimeRetryTimers<ReturnType<typeof setTimeout>>;
};

export function createVocabularyRealtimeSync({
  createRefreshScheduler,
  getClient = () =>
    getSupabaseBrowserClient() as VocabularyRealtimeClient | null,
  refresh,
  retryMs,
  retryTimers,
}: CreateVocabularyRealtimeSyncOptions) {
  return createVocabularyRealtimeController<AuthStateSnapshot>({
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
