import {
  createVocabularyRealtimeRefreshScheduler,
  createVocabularyRealtimeTopic,
  type VocabularyRealtimeRefreshScheduler,
  type VocabularyRealtimeRefreshSchedulerFactory,
} from "./vocabularyRefreshPolicy.ts";

export type VocabularyRealtimeEvent = "DELETE" | "INSERT" | "UPDATE";
export type VocabularyRealtimeSubscribeStatus =
  | "CHANNEL_ERROR"
  | "CLOSED"
  | "SUBSCRIBED"
  | "TIMED_OUT";

export type VocabularyRealtimeChannel = {
  on(
    type: "broadcast",
    filter: { event: VocabularyRealtimeEvent },
    callback: () => void,
  ): VocabularyRealtimeChannel;
  subscribe(
    callback?: (
      status: VocabularyRealtimeSubscribeStatus,
      error?: Error,
    ) => void,
  ): VocabularyRealtimeChannel;
};

export type VocabularyRealtimeClient<
  Channel extends VocabularyRealtimeChannel = VocabularyRealtimeChannel,
> = {
  channel(topic: string, options: { config: { private: true } }): Channel;
  realtime: {
    setAuth(accessToken?: string | null): Promise<void> | void;
  };
  removeChannel(channel: Channel): Promise<unknown> | unknown;
};

export type VocabularyRealtimeConnection = {
  accessToken: string;
  userId: string;
};

export type VocabularyRealtimeController<Context> = {
  cleanup(): Promise<unknown>;
  sync(context: Context): void;
};

export type VocabularyRealtimeRetryTimers<TimerId> = {
  clearTimeout(timerId: TimerId): void;
  setTimeout(callback: () => void, delayMs: number): TimerId;
};

const VOCABULARY_REALTIME_EVENTS: VocabularyRealtimeEvent[] = [
  "INSERT",
  "UPDATE",
  "DELETE",
];
const VOCABULARY_REALTIME_FAILURE_STATUSES =
  new Set<VocabularyRealtimeSubscribeStatus>([
    "CHANNEL_ERROR",
    "CLOSED",
    "TIMED_OUT",
  ]);
export const VOCABULARY_REALTIME_RETRY_MS = 2_000;

export function createVocabularyRealtimeController<
  Context,
  TimerId = ReturnType<typeof setTimeout>,
>({
  createRefreshScheduler = (refresh) =>
    createVocabularyRealtimeRefreshScheduler({ refresh }),
  getClient,
  getConnection,
  refresh,
  retryMs = VOCABULARY_REALTIME_RETRY_MS,
  retryTimers = createDefaultVocabularyRealtimeRetryTimers() as VocabularyRealtimeRetryTimers<TimerId>,
}: {
  createRefreshScheduler?: VocabularyRealtimeRefreshSchedulerFactory;
  getClient: () => VocabularyRealtimeClient | null;
  getConnection: (context: Context) => VocabularyRealtimeConnection | null;
  refresh: (context: Context) => Promise<unknown> | unknown;
  retryMs?: number;
  retryTimers?: VocabularyRealtimeRetryTimers<TimerId>;
}): VocabularyRealtimeController<Context> {
  let activeAccessToken: string | null = null;
  let activeChannel: VocabularyRealtimeChannel | null = null;
  let activeClient: VocabularyRealtimeClient | null = null;
  let activeScheduler: VocabularyRealtimeRefreshScheduler | null = null;
  let activeTopic: string | null = null;
  let channelRemovalPromise: Promise<unknown> = Promise.resolve();
  let connectionSetupPromise: Promise<void> | null = null;
  let desiredContext: Context | undefined;
  let pendingAccessToken: string | null = null;
  let pendingTopic: string | null = null;
  let retryTimerId: TimerId | null = null;
  let subscriptionSequence = 0;

  const clearRetry = () => {
    if (retryTimerId === null) {
      return;
    }

    retryTimers.clearTimeout(retryTimerId);
    retryTimerId = null;
  };

  const removeActiveChannel = () => {
    activeScheduler?.cancel();

    const channel = activeChannel;
    const client = activeClient;

    activeAccessToken = null;
    activeChannel = null;
    activeClient = null;
    activeScheduler = null;
    activeTopic = null;

    if (channel && client) {
      try {
        channelRemovalPromise = Promise.resolve(
          client.removeChannel(channel),
        ).catch(() => undefined);
      } catch {
        channelRemovalPromise = Promise.resolve();
      }
    }

    return channelRemovalPromise;
  };

  const isDesiredConnection = (connection: VocabularyRealtimeConnection) => {
    if (desiredContext === undefined) {
      return false;
    }

    const desiredConnection = getConnection(desiredContext);

    return (
      desiredConnection?.accessToken === connection.accessToken &&
      desiredConnection.userId === connection.userId
    );
  };

  const connect = (connection: VocabularyRealtimeConnection) => {
    clearRetry();
    const channelRemoval = removeActiveChannel();
    const topic = createVocabularyRealtimeTopic(connection.userId);

    if (!topic) {
      return;
    }

    subscriptionSequence += 1;
    const requestId = subscriptionSequence;
    pendingAccessToken = connection.accessToken;
    pendingTopic = topic;

    const scheduler = createRefreshScheduler(() => {
      if (desiredContext === undefined || !isDesiredConnection(connection)) {
        return;
      }

      return Promise.resolve(refresh(desiredContext)).then(() => undefined);
    });

    const scheduleReconnect = () => {
      if (
        requestId !== subscriptionSequence ||
        !isDesiredConnection(connection)
      ) {
        scheduler.cancel();
        return;
      }

      scheduler.cancel();
      subscriptionSequence += 1;
      pendingAccessToken = null;
      pendingTopic = null;
      const removal = removeActiveChannel();
      clearRetry();
      retryTimerId = retryTimers.setTimeout(
        () => {
          retryTimerId = null;

          void removal.then(() => {
            const nextContext = desiredContext;

            if (nextContext === undefined) {
              return;
            }

            const nextConnection = getConnection(nextContext);

            if (
              nextConnection?.accessToken === connection.accessToken &&
              nextConnection.userId === connection.userId
            ) {
              connect(nextConnection);
            }
          });
        },
        Math.max(0, retryMs),
      );
    };

    const client = getClient();

    if (!client) {
      scheduleReconnect();
      return;
    }

    const setupReady = connectionSetupPromise
      ? connectionSetupPromise.then(() => channelRemoval)
      : channelRemoval;
    const setupAttempt = setupReady.then(async () => {
      if (
        requestId !== subscriptionSequence ||
        !isDesiredConnection(connection)
      ) {
        scheduler.cancel();
        return;
      }

      await client.realtime.setAuth(connection.accessToken);

      if (
        requestId !== subscriptionSequence ||
        !isDesiredConnection(connection)
      ) {
        scheduler.cancel();
        return;
      }

      const channel = client.channel(topic, {
        config: { private: true },
      });
      const isCurrentSubscription = () =>
        requestId === subscriptionSequence &&
        activeAccessToken === connection.accessToken &&
        activeChannel === channel &&
        activeScheduler === scheduler &&
        activeTopic === topic &&
        isDesiredConnection(connection);

      for (const event of VOCABULARY_REALTIME_EVENTS) {
        channel.on("broadcast", { event }, () => {
          if (isCurrentSubscription()) {
            scheduler.schedule();
          }
        });
      }

      activeAccessToken = connection.accessToken;
      activeChannel = channel;
      activeClient = client;
      activeScheduler = scheduler;
      activeTopic = topic;
      pendingAccessToken = null;
      pendingTopic = null;

      channel.subscribe((status) => {
        if (
          isCurrentSubscription() &&
          VOCABULARY_REALTIME_FAILURE_STATUSES.has(status)
        ) {
          scheduleReconnect();
        }
      });
    });

    const settledSetup = setupAttempt.then(
      () => undefined,
      () => undefined,
    );
    connectionSetupPromise = settledSetup;
    void settledSetup.then(() => {
      if (connectionSetupPromise === settledSetup) {
        connectionSetupPromise = null;
      }
    });
    void setupAttempt.catch(scheduleReconnect);
  };

  const cleanup = () => {
    desiredContext = undefined;
    pendingAccessToken = null;
    pendingTopic = null;
    clearRetry();
    subscriptionSequence += 1;
    return removeActiveChannel();
  };

  return {
    cleanup,

    sync(context) {
      const connection = getConnection(context);

      if (!connection) {
        void cleanup();
        return;
      }

      desiredContext = context;
      const topic = createVocabularyRealtimeTopic(connection.userId);

      if (!topic) {
        void cleanup();
        return;
      }

      if (
        (activeTopic === topic &&
          activeAccessToken === connection.accessToken &&
          activeChannel) ||
        (pendingTopic === topic &&
          pendingAccessToken === connection.accessToken)
      ) {
        return;
      }

      connect(connection);
    },
  };
}

function createDefaultVocabularyRealtimeRetryTimers(): VocabularyRealtimeRetryTimers<
  ReturnType<typeof setTimeout>
> {
  return {
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
    setTimeout: globalThis.setTimeout.bind(globalThis),
  };
}
