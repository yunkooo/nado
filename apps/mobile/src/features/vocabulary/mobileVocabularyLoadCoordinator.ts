export type MobileVocabularyRefreshResult = "failed" | "ignored" | "refreshed";

export type MobileVocabularyLoadOperation = (context: {
  isQueuedRefresh: boolean;
}) => Promise<MobileVocabularyRefreshResult>;

type ActiveVocabularyLoad = {
  accessToken: string;
  cancelled: boolean;
  pendingForcedRefresh: boolean;
  promise: Promise<MobileVocabularyRefreshResult>;
};

export function createMobileVocabularyLoadCoordinator() {
  let activeLoad: ActiveVocabularyLoad | null = null;

  return {
    cancel() {
      if (activeLoad) {
        activeLoad.cancelled = true;
      }

      activeLoad = null;
    },

    run(
      accessToken: string,
      { force = false }: { force?: boolean },
      operation: MobileVocabularyLoadOperation,
    ): Promise<MobileVocabularyRefreshResult> {
      if (activeLoad?.accessToken === accessToken) {
        if (force) {
          activeLoad.pendingForcedRefresh = true;
        }

        return activeLoad.promise;
      }

      if (activeLoad) {
        activeLoad.cancelled = true;
      }

      const nextLoad: ActiveVocabularyLoad = {
        accessToken,
        cancelled: false,
        pendingForcedRefresh: false,
        promise: Promise.resolve("ignored"),
      };
      activeLoad = nextLoad;
      nextLoad.promise = runLoadOperations(nextLoad, operation).finally(() => {
        if (activeLoad === nextLoad) {
          activeLoad = null;
        }
      });

      return nextLoad.promise;
    },
  };
}

async function runLoadOperations(
  activeLoad: ActiveVocabularyLoad,
  operation: MobileVocabularyLoadOperation,
): Promise<MobileVocabularyRefreshResult> {
  let isQueuedRefresh = false;

  while (!activeLoad.cancelled) {
    const result = await operation({ isQueuedRefresh });

    if (activeLoad.cancelled) {
      return "ignored";
    }

    if (!activeLoad.pendingForcedRefresh) {
      return result;
    }

    activeLoad.pendingForcedRefresh = false;
    isQueuedRefresh = true;
  }

  return "ignored";
}
