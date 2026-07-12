import { Buffer } from "node:buffer";
import { createVocabularyRealtimeTopic } from "@nado/shared/vocabulary-realtime";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

type JsonRecord = Record<string, unknown>;
export type RealtimeSmokeEvent = "DELETE" | "INSERT" | "UPDATE";
type RealtimeSmokeSubscribeStatus =
  | "CHANNEL_ERROR"
  | "CLOSED"
  | "SUBSCRIBED"
  | "TIMED_OUT"
  | string;

type RealtimeSmokeBroadcastPayload = {
  payload?: unknown;
  record?: unknown;
  old?: unknown;
  old_record?: unknown;
  new?: unknown;
};

type RealtimeSmokeChannel = {
  on(
    type: "broadcast",
    filter: { event: RealtimeSmokeEvent },
    callback: (payload: RealtimeSmokeBroadcastPayload) => void,
  ): RealtimeSmokeChannel;
  subscribe(
    callback?: (status: RealtimeSmokeSubscribeStatus, error?: Error) => void,
  ): RealtimeSmokeChannel;
};

type RealtimeSmokeClient = {
  channel(
    topic: string,
    options: { config: { private: true } },
  ): RealtimeSmokeChannel;
  realtime: {
    setAuth(accessToken?: string | null): Promise<void> | void;
  };
  removeChannel(channel: RealtimeSmokeChannel): Promise<unknown> | unknown;
};

export type RealtimeSmokeClientFactory = (
  supabaseUrl: string,
  supabaseAnonKey: string,
) => RealtimeSmokeClient;

export type VocabularyRealtimeMonitor = {
  close(): Promise<void>;
  waitForAny(
    events: RealtimeSmokeEvent[],
    itemId: string,
  ): Promise<RealtimeSmokeEvent>;
};

export async function createVocabularyRealtimeMonitor({
  accessToken,
  createClient = createDefaultRealtimeClient,
  realtimeUserId,
  supabaseAnonKey,
  supabaseUrl,
  timeoutMs,
}: {
  accessToken: string;
  createClient?: RealtimeSmokeClientFactory;
  realtimeUserId: string | null;
  supabaseAnonKey: string;
  supabaseUrl: string;
  timeoutMs: number;
}): Promise<VocabularyRealtimeMonitor> {
  const topic = createVocabularyRealtimeTopic(realtimeUserId);

  if (!topic) {
    throw new Error(
      "Realtime smoke requires NADO_SMOKE_USER_ID or a Supabase JWT access token with sub.",
    );
  }

  const client = createClient(supabaseUrl, supabaseAnonKey);
  await client.realtime.setAuth(accessToken);

  const receivedEvents = new Set<string>();
  const waiters = new Set<{
    events: RealtimeSmokeEvent[];
    itemId: string;
    reject(error: Error): void;
    resolve(event: RealtimeSmokeEvent): void;
    timeoutId: ReturnType<typeof setTimeout>;
  }>();

  const handleEvent = (
    event: RealtimeSmokeEvent,
    payload: RealtimeSmokeBroadcastPayload,
  ) => {
    const itemId = getRealtimeSmokePayloadItemId(event, payload);

    if (!itemId) {
      return;
    }

    receivedEvents.add(createRealtimeSmokeEventKey(event, itemId));

    for (const waiter of [...waiters]) {
      if (waiter.itemId === itemId && waiter.events.includes(event)) {
        clearTimeout(waiter.timeoutId);
        waiters.delete(waiter);
        waiter.resolve(event);
      }
    }
  };

  const channel = client
    .channel(topic, { config: { private: true } })
    .on("broadcast", { event: "INSERT" }, (payload) =>
      handleEvent("INSERT", payload),
    )
    .on("broadcast", { event: "UPDATE" }, (payload) =>
      handleEvent("UPDATE", payload),
    )
    .on("broadcast", { event: "DELETE" }, (payload) =>
      handleEvent("DELETE", payload),
    );

  try {
    await new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(
          new Error(
            `Realtime smoke channel ${topic} was not subscribed within ${timeoutMs}ms.`,
          ),
        );
      }, timeoutMs);

      channel.subscribe((status, error) => {
        if (status === "SUBSCRIBED") {
          clearTimeout(timeoutId);
          resolve();
          return;
        }

        if (
          status === "CHANNEL_ERROR" ||
          status === "CLOSED" ||
          status === "TIMED_OUT"
        ) {
          clearTimeout(timeoutId);
          reject(
            error ??
              new Error(
                `Realtime smoke channel ${topic} failed with ${status}.`,
              ),
          );
        }
      });
    });
  } catch (error) {
    await client.removeChannel(channel);
    throw error;
  }

  return {
    async close() {
      for (const waiter of waiters) {
        clearTimeout(waiter.timeoutId);
        waiter.reject(new Error("Realtime smoke monitor was closed."));
      }

      waiters.clear();
      await client.removeChannel(channel);
    },
    waitForAny(events, itemId) {
      const alreadyReceivedEvent = events.find((event) =>
        receivedEvents.has(createRealtimeSmokeEventKey(event, itemId)),
      );

      if (alreadyReceivedEvent) {
        return Promise.resolve(alreadyReceivedEvent);
      }

      return new Promise((resolve, reject) => {
        let waiter: {
          events: RealtimeSmokeEvent[];
          itemId: string;
          reject(error: Error): void;
          resolve(event: RealtimeSmokeEvent): void;
          timeoutId: ReturnType<typeof setTimeout>;
        };
        const timeoutId = setTimeout(() => {
          waiters.delete(waiter);
          reject(
            new Error(
              `Realtime smoke did not receive ${events.join(" or ")} for ${itemId} within ${timeoutMs}ms.`,
            ),
          );
        }, timeoutMs);
        waiter = {
          events,
          itemId,
          reject,
          resolve,
          timeoutId,
        };

        waiters.add(waiter);
      });
    },
  };
}

export function getSubjectFromAccessToken(accessToken: string): string | null {
  const [, payload] = accessToken.split(".");

  if (!payload) {
    return null;
  }

  try {
    const decodedPayload = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as unknown;

    if (!isRecord(decodedPayload) || typeof decodedPayload.sub !== "string") {
      return null;
    }

    return decodedPayload.sub;
  } catch {
    return null;
  }
}

function createRealtimeSmokeEventKey(
  event: RealtimeSmokeEvent,
  itemId: string,
): string {
  return `${event}:${itemId}`;
}

function getRealtimeSmokePayloadItemId(
  event: RealtimeSmokeEvent,
  payload: RealtimeSmokeBroadcastPayload,
): string | null {
  const body = (
    isRecord(payload.payload) ? payload.payload : payload
  ) as JsonRecord;
  const recordKeys =
    event === "DELETE"
      ? ["old_record", "old", "record", "new"]
      : ["record", "new", "old_record", "old"];

  for (const key of recordKeys) {
    const record = body[key];

    if (isRecord(record) && typeof record.id === "string") {
      return record.id;
    }
  }

  return typeof body.id === "string" ? body.id : null;
}

function createDefaultRealtimeClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
): RealtimeSmokeClient {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }) as unknown as RealtimeSmokeClient;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}
