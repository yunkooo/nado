export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type JsonRecord = Record<string, unknown>;

export async function checkHealth(
  baseUrl: string,
  fetchImplementation: FetchLike,
): Promise<void> {
  const payload = await requestJson(fetchImplementation, `${baseUrl}/health`);

  if (payload.service !== "nado-api" || payload.status !== "ok") {
    throw new Error("Health check response did not match nado API.");
  }
}

export async function checkReadiness(
  baseUrl: string,
  fetchImplementation: FetchLike,
): Promise<void> {
  const payload = await requestJson(fetchImplementation, `${baseUrl}/ready`);

  if (payload.service !== "nado-api" || payload.status !== "ready") {
    throw new Error("Readiness check response did not match nado API.");
  }
}

export async function checkAnalyze(
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

export async function checkVocabularySave(
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

export async function checkVocabularyList(
  baseUrl: string,
  fetchImplementation: FetchLike,
  accessToken: string,
  itemId: string,
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

  if (!payload.items.some((item) => isRecord(item) && item.id === itemId)) {
    throw new Error(
      `Vocabulary list smoke response did not include saved item ${itemId}.`,
    );
  }
}

export async function checkVocabularyDelete(
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

export async function cleanupVocabularyItem(
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

function requestJson(
  fetchImplementation: FetchLike,
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<JsonRecord> {
  return fetchImplementation(input, init).then(async (response) => {
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
  });
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
