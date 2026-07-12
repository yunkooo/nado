export type MobileVocabularyLoadOperation = (context: {
  isQueuedRefresh: boolean;
}) => Promise<void>;

type ActiveVocabularyLoad = {
  accessToken: string;
  cancelled: boolean;
  pendingForcedRefresh: boolean;
  promise: Promise<void>;
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
    ): Promise<void> {
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
        promise: Promise.resolve(),
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
) {
  let isQueuedRefresh = false;

  while (!activeLoad.cancelled) {
    await operation({ isQueuedRefresh });

    if (activeLoad.cancelled || !activeLoad.pendingForcedRefresh) {
      return;
    }

    activeLoad.pendingForcedRefresh = false;
    isQueuedRefresh = true;
  }
}
