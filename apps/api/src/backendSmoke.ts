import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import {
  checkAnalyze,
  checkHealth,
  checkReadiness,
  checkVocabularyDelete,
  checkVocabularyList,
  checkVocabularySave,
  cleanupVocabularyItem,
  type FetchLike,
} from "./backendSmokeHttp.js";
import {
  createVocabularyRealtimeMonitor,
  getSubjectFromAccessToken,
  type RealtimeSmokeClientFactory,
} from "./backendSmokeRealtime.js";
import { loadRootEnv } from "./infrastructure/env/rootEnv.js";

loadRootEnv();

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

const DEFAULT_BASE_URL = "http://localhost:4000";
const DEFAULT_ANALYZE_TEXT = "";
const DEFAULT_REALTIME_TIMEOUT_MS = 5_000;

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

  await checkReadiness(baseUrl, fetchImplementation);
  checks.push("readiness");
  log("readiness ok");

  if (options.analyzeText) {
    await checkAnalyze(baseUrl, fetchImplementation, options.analyzeText);
    checks.push("analyze");
    log("analyze ok");
  }

  if (options.accessToken) {
    const vocabularyTerm =
      options.vocabularyTerm ?? `nado-smoke-${randomUUID()}`;
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
          timeoutMs: options.realtimeTimeoutMs ?? DEFAULT_REALTIME_TIMEOUT_MS,
        })
      : null;

    try {
      itemId = await checkVocabularySave(
        baseUrl,
        fetchImplementation,
        options.accessToken,
        vocabularyTerm,
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
        itemId,
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

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

export function parseOptionalPositiveInteger(
  value: string | undefined,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalizedValue = value.trim();
  const parsedValue = Number(normalizedValue);

  if (
    !/^\d+$/.test(normalizedValue) ||
    !Number.isSafeInteger(parsedValue) ||
    parsedValue <= 0
  ) {
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
    vocabularyTerm: process.env.NADO_SMOKE_VOCABULARY_TERM || undefined,
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
