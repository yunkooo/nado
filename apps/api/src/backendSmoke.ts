import { Buffer } from "node:buffer";
import { pathToFileURL } from "node:url";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createVocabularyRealtimeTopic } from "@nado/shared";
import { loadRootEnv } from "./infrastructure/env/rootEnv.js";

loadRootEnv();

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type BackendSmokeOptions = {
  accessToken?: string;
  analyzeText?: string;
  baseUrl?: string;
  createRealtimeClient?: RealtimeSmokeClientFactory;
  fetch?: FetchLike;
  log?: (message: string) => void;
  realtime?: boolean;
  realtimeTimeoutMs?: number;
  realtimeUserId?: string;
  supabaseAnonKey?: string;
  supabaseUrl?: string;
  vocabularyTerm?: string;
};

export type BackendSmokeResult = {
  checks: string[];
};

type JsonRecord = Record<string, unknown>;
type RealtimeSmokeEvent = "DELETE" | "INSERT" | "UPDATE";
type RealtimeSmokeSubscribeStatus =
  | "CHANNEL_ERROR"
  | "CLOSED"
  | "SUBSCRIBED"
  | "TIMED_OUT"
  | string;

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

type RealtimeSmokeBroadcastPayload = {
  payload?: unknown;
  record?: unknown;
  old?: unknown;
  old_record?: unknown;
  new?: unknown;
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

type RealtimeSmokeClientFactory = (
  supabaseUrl: string,
  supabaseAnonKey: string,
) => RealtimeSmokeClient;

type VocabularyRealtimeMonitor = {
  close(): Promise<void>;
  waitForAny(
    events: RealtimeSmokeEvent[],
    itemId: string,
  ): Promise<RealtimeSmokeEvent>;
};

const DEFAULT_BASE_URL = "http://localhost:4000";
const DEFAULT_ANALYZE_TEXT = "";
const DEFAULT_REALTIME_TIMEOUT_MS = 5_000;
const DEFAULT_VOCABULARY_TERM = "nado-smoke";

export async function runBackendSmoke(
  options: BackendSmokeOptions = {},
): Promise<BackendSmokeResult> {
  const baseUrl = normalizeBaseUrl(
    options.baseUrl ?? process.env.NADO_API_BASE_URL ?? DEFAULT_BASE_URL,
  );
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const log = options.log ?? (() => undefined);
  const checks: string[] = [];

  if (options.realtime && !options.accessToken?.trim()) {
    throw new Error(
      "Realtime smoke requires NADO_SMOKE_ACCESS_TOKEN when NADO_SMOKE_REALTIME=1.",
    );
  }

  await checkHealth(baseUrl, fetchImplementation);
  checks.push("health");
  log("health ok");

  if (options.analyzeText) {
    await checkAnalyze(baseUrl, fetchImplementation, options.analyzeText);
    checks.push("analyze");
    log("analyze ok");
  }

  if (options.accessToken) {
    let itemId: string | null = null;
    let itemDeleted = false;
    const realtimeMonitor = options.realtime
      ? await createVocabularyRealtimeMonitor({
          accessToken: options.accessToken,
          createClient: options.createRealtimeClient,
          realtimeUserId:
            options.realtimeUserId ??
            getSubjectFromAccessToken(options.accessToken),
          supabaseAnonKey: resolveSmokeSupabaseAnonKey(options),
          supabaseUrl: resolveSmokeSupabaseUrl(options),
          timeoutMs: options.realtimeTimeoutMs,
        })
      : null;

    try {
      itemId = await checkVocabularySave(
        baseUrl,
        fetchImplementation,
        options.accessToken,
        options.vocabularyTerm ?? DEFAULT_VOCABULARY_TERM,
      );
      checks.push("vocabulary:save");
      log("vocabulary save ok");

      if (realtimeMonitor) {
        await realtimeMonitor.waitForAny(["INSERT", "UPDATE"], itemId);
        checks.push("vocabulary:realtime:save");
        log("vocabulary realtime save ok");
      }

      await checkVocabularyList(
        baseUrl,
        fetchImplementation,
        options.accessToken,
      );
      checks.push("vocabulary:list");
      log("vocabulary list ok");

      await checkVocabularyDelete(
        baseUrl,
        fetchImplementation,
        options.accessToken,
        itemId,
      );
      itemDeleted = true;
      checks.push("vocabulary:delete");
      log("vocabulary delete ok");

      if (realtimeMonitor) {
        await realtimeMonitor.waitForAny(["DELETE"], itemId);
        checks.push("vocabulary:realtime:delete");
        log("vocabulary realtime delete ok");
      }
    } finally {
      if (itemId !== null && !itemDeleted) {
        await cleanupVocabularyItem(
          baseUrl,
          fetchImplementation,
          options.accessToken,
          itemId,
        );
      }

      await realtimeMonitor?.close();
    }
  }

  return { checks };
}

async function checkHealth(
  baseUrl: string,
  fetchImplementation: FetchLike,
): Promise<void> {
  const payload = await requestJson(fetchImplementation, `${baseUrl}/health`);

  if (payload.service !== "nado-api" || payload.status !== "ok") {
    throw new Error("Health check response did not match nado API.");
  }
}

async function checkAnalyze(
  baseUrl: string,
  fetchImplementation: FetchLike,
  text: string,
): Promise<void> {
  const payload = await requestJson(
    fetchImplementation,
    `${baseUrl}/api/analyze`,
    {
      body: JSON.stringify({ text }),
      headers: jsonHeaders(),
      method: "POST",
    },
  );

  if (payload.status !== "analyzable" && payload.status !== "not_analyzable") {
    throw new Error("Analyze smoke response did not include a valid status.");
  }
}

async function checkVocabularySave(
  baseUrl: string,
  fetchImplementation: FetchLike,
  accessToken: string,
  term: string,
): Promise<string> {
  const payload = await requestJson(
    fetchImplementation,
    `${baseUrl}/api/vocabulary`,
    {
      body: JSON.stringify({
        meaning: "스모크 테스트 항목",
        note: "백엔드 smoke 검증 후 삭제됩니다.",
        term,
        type: "word",
      }),
      headers: authJsonHeaders(accessToken),
      method: "POST",
    },
  );

  if (!isRecord(payload.item) || typeof payload.item.id !== "string") {
    throw new Error("Vocabulary save smoke response did not include item.id.");
  }

  return payload.item.id;
}

async function checkVocabularyList(
  baseUrl: string,
  fetchImplementation: FetchLike,
  accessToken: string,
): Promise<void> {
  const payload = await requestJson(
    fetchImplementation,
    `${baseUrl}/api/vocabulary`,
    {
      headers: authJsonHeaders(accessToken),
      method: "GET",
    },
  );

  if (!Array.isArray(payload.items)) {
    throw new Error("Vocabulary list smoke response did not include items.");
  }
}

async function checkVocabularyDelete(
  baseUrl: string,
  fetchImplementation: FetchLike,
  accessToken: string,
  itemId: string,
): Promise<void> {
  const response = await fetchImplementation(
    `${baseUrl}/api/vocabulary/${encodeURIComponent(itemId)}`,
    {
      headers: authJsonHeaders(accessToken),
      method: "DELETE",
    },
  );

  if (response.status !== 204) {
    throw new Error(
      `Vocabulary delete smoke request failed with ${response.status}.`,
    );
  }
}

async function cleanupVocabularyItem(
  baseUrl: string,
  fetchImplementation: FetchLike,
  accessToken: string,
  itemId: string,
): Promise<void> {
  try {
    await checkVocabularyDelete(
      baseUrl,
      fetchImplementation,
      accessToken,
      itemId,
    );
  } catch {
    // Smoke failure should report the original failing check, not cleanup noise.
  }
}

async function createVocabularyRealtimeMonitor({
  accessToken,
  createClient = createDefaultRealtimeClient,
  realtimeUserId,
  supabaseAnonKey,
  supabaseUrl,
  timeoutMs = DEFAULT_REALTIME_TIMEOUT_MS,
}: {
  accessToken: string;
  createClient?: RealtimeSmokeClientFactory;
  realtimeUserId: string | null;
  supabaseAnonKey: string;
  supabaseUrl: string;
  timeoutMs?: number;
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

function resolveSmokeSupabaseUrl(options: BackendSmokeOptions): string {
  const value =
    options.supabaseUrl ??
    process.env.NADO_SMOKE_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL;

  if (!value) {
    throw new Error(
      "Realtime smoke requires NADO_SMOKE_SUPABASE_URL or SUPABASE_URL.",
    );
  }

  return value;
}

function resolveSmokeSupabaseAnonKey(options: BackendSmokeOptions): string {
  const value =
    options.supabaseAnonKey ??
    process.env.NADO_SMOKE_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!value) {
    throw new Error(
      "Realtime smoke requires NADO_SMOKE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY.",
    );
  }

  return value;
}

function getSubjectFromAccessToken(accessToken: string): string | null {
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

async function requestJson(
  fetchImplementation: FetchLike,
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<JsonRecord> {
  const response = await fetchImplementation(input, init);

  if (!response.ok) {
    throw new Error(
      `Smoke request to ${String(input)} failed with ${response.status}.`,
    );
  }

  const payload = (await response.json()) as unknown;

  if (!isRecord(payload)) {
    throw new Error(`Smoke request to ${String(input)} did not return JSON.`);
  }

  return payload;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function jsonHeaders(): Headers {
  return new Headers({
    "Content-Type": "application/json",
  });
}

function authJsonHeaders(accessToken: string): Headers {
  const headers = jsonHeaders();
  headers.set("Authorization", `Bearer ${accessToken}`);

  return headers;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

function parseOptionalPositiveInteger(
  value: string | undefined,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new Error(
      "NADO_SMOKE_REALTIME_TIMEOUT_MS must be a positive integer.",
    );
  }

  return parsedValue;
}

async function main(): Promise<void> {
  const result = await runBackendSmoke({
    accessToken: process.env.NADO_SMOKE_ACCESS_TOKEN,
    analyzeText: process.env.NADO_SMOKE_ANALYZE_TEXT ?? DEFAULT_ANALYZE_TEXT,
    baseUrl: process.env.NADO_API_BASE_URL,
    log: (message) => console.log(`[backend-smoke] ${message}`),
    realtime: process.env.NADO_SMOKE_REALTIME === "1",
    realtimeTimeoutMs: parseOptionalPositiveInteger(
      process.env.NADO_SMOKE_REALTIME_TIMEOUT_MS,
    ),
    realtimeUserId: process.env.NADO_SMOKE_USER_ID,
    supabaseAnonKey: process.env.NADO_SMOKE_SUPABASE_ANON_KEY,
    supabaseUrl: process.env.NADO_SMOKE_SUPABASE_URL,
    vocabularyTerm:
      process.env.NADO_SMOKE_VOCABULARY_TERM ?? DEFAULT_VOCABULARY_TERM,
  });

  console.log(`[backend-smoke] checks: ${result.checks.join(", ")}`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Backend smoke check failed.",
    );
    process.exitCode = 1;
  });
}
