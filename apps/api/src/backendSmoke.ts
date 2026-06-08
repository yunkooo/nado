import { pathToFileURL } from "node:url";

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type BackendSmokeOptions = {
  accessToken?: string;
  analyzeText?: string;
  baseUrl?: string;
  fetch?: FetchLike;
  log?: (message: string) => void;
  vocabularyTerm?: string;
};

export type BackendSmokeResult = {
  checks: string[];
};

type JsonRecord = Record<string, unknown>;

const DEFAULT_BASE_URL = "http://localhost:4000";
const DEFAULT_ANALYZE_TEXT = "";
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

  await checkHealth(baseUrl, fetchImplementation);
  checks.push("health");
  log("health ok");

  if (options.analyzeText) {
    await checkAnalyze(baseUrl, fetchImplementation, options.analyzeText);
    checks.push("analyze");
    log("analyze ok");
  }

  if (options.accessToken) {
    const itemId = await checkVocabularySave(
      baseUrl,
      fetchImplementation,
      options.accessToken,
      options.vocabularyTerm ?? DEFAULT_VOCABULARY_TERM,
    );
    checks.push("vocabulary:save");
    log("vocabulary save ok");

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
    checks.push("vocabulary:delete");
    log("vocabulary delete ok");
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

async function main(): Promise<void> {
  const result = await runBackendSmoke({
    accessToken: process.env.NADO_SMOKE_ACCESS_TOKEN,
    analyzeText: process.env.NADO_SMOKE_ANALYZE_TEXT ?? DEFAULT_ANALYZE_TEXT,
    baseUrl: process.env.NADO_API_BASE_URL,
    log: (message) => console.log(`[backend-smoke] ${message}`),
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
