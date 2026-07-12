export const VOCABULARY_REALTIME_TOPIC_PREFIX = "vocabulary:";
export const VOCABULARY_REALTIME_REFRESH_DEBOUNCE_MS = 300;
export const VOCABULARY_LIFECYCLE_REFRESH_STALE_MS = 60 * 1000;
export const VOCABULARY_MANUAL_REFRESH_THROTTLE_MS = 2 * 1000;

export type VocabularyRealtimeRefreshTask = () => Promise<void> | void;

export type VocabularyRealtimeRefreshTimers<TimerId> = {
  clearTimeout(timerId: TimerId): void;
  setTimeout(callback: () => void, delayMs: number): TimerId;
};

export type VocabularyRealtimeRefreshScheduler = {
  cancel(): void;
  isScheduled(): boolean;
  schedule(): void;
};

export type VocabularyRealtimeRefreshSchedulerFactory = (
  refresh: VocabularyRealtimeRefreshTask,
) => VocabularyRealtimeRefreshScheduler;

export function shouldRefreshVocabularyFromLifecycle({
  isStudySurfaceActive,
  lastLoadedAt,
  now,
  staleMs = VOCABULARY_LIFECYCLE_REFRESH_STALE_MS,
  status,
}: {
  isStudySurfaceActive: boolean;
  lastLoadedAt: number | undefined;
  now: number;
  staleMs?: number;
  status: "error" | "idle" | "loading" | "ready";
}) {
  if (!isStudySurfaceActive) {
    return false;
  }

  if (status !== "ready") {
    return true;
  }

  if (lastLoadedAt === undefined) {
    return true;
  }

  return now - lastLoadedAt >= staleMs;
}

export function shouldStartVocabularyManualRefresh({
  isRefreshing,
  lastStartedAt,
  now,
  throttleMs = VOCABULARY_MANUAL_REFRESH_THROTTLE_MS,
}: {
  isRefreshing: boolean;
  lastStartedAt: number | undefined;
  now: number;
  throttleMs?: number;
}) {
  if (isRefreshing) {
    return false;
  }

  if (lastStartedAt === undefined) {
    return true;
  }

  return now - lastStartedAt >= Math.max(0, throttleMs);
}

export function createVocabularyRealtimeTopic(
  userId: string | null | undefined,
) {
  const normalizedUserId = userId?.trim();

  if (!normalizedUserId) {
    return null;
  }

  return `${VOCABULARY_REALTIME_TOPIC_PREFIX}${normalizedUserId}`;
}

export function isVocabularyRealtimeTopicForUser(
  topic: string,
  userId: string | null | undefined,
) {
  const expectedTopic = createVocabularyRealtimeTopic(userId);

  return expectedTopic !== null && topic === expectedTopic;
}

export function createVocabularyRealtimeRefreshScheduler<
  TimerId = ReturnType<typeof setTimeout>,
>({
  debounceMs = VOCABULARY_REALTIME_REFRESH_DEBOUNCE_MS,
  refresh,
  timers = createDefaultVocabularyRealtimeRefreshTimers() as VocabularyRealtimeRefreshTimers<TimerId>,
}: {
  debounceMs?: number;
  refresh: VocabularyRealtimeRefreshTask;
  timers?: VocabularyRealtimeRefreshTimers<TimerId>;
}): VocabularyRealtimeRefreshScheduler {
  let isRefreshing = false;
  let pendingAfterRefresh = false;
  let timerId: TimerId | null = null;
  const normalizedDebounceMs = Math.max(0, debounceMs);

  const schedule = () => {
    if (timerId !== null) {
      return;
    }

    timerId = timers.setTimeout(runRefresh, normalizedDebounceMs);
  };

  const finishRefresh = () => {
    isRefreshing = false;

    if (!pendingAfterRefresh) {
      return;
    }

    pendingAfterRefresh = false;
    schedule();
  };

  const runRefresh = () => {
    timerId = null;

    if (isRefreshing) {
      pendingAfterRefresh = true;
      return;
    }

    isRefreshing = true;

    let refreshResult: Promise<void> | void;

    try {
      refreshResult = refresh();
    } catch {
      finishRefresh();
      return;
    }

    void Promise.resolve(refreshResult).then(finishRefresh, finishRefresh);
  };

  return {
    cancel() {
      pendingAfterRefresh = false;

      if (timerId === null) {
        return;
      }

      timers.clearTimeout(timerId);
      timerId = null;
    },

    isScheduled() {
      return timerId !== null;
    },

    schedule,
  };
}

function createDefaultVocabularyRealtimeRefreshTimers(): VocabularyRealtimeRefreshTimers<
  ReturnType<typeof setTimeout>
> {
  return {
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
    setTimeout: globalThis.setTimeout.bind(globalThis),
  };
}
