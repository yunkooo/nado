type Fetcher = typeof fetch;

export type ApiRequestOptions = {
  fetcher?: Fetcher;
  timeoutMs?: number;
};

export type ApiFetchError = {
  message: string;
  status: "error";
};

export type ApiFetchResult =
  | {
      response: Response;
      status: "success";
    }
  | ApiFetchError;

const DEFAULT_API_REQUEST_TIMEOUT_MS = 10000;

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  {
    fallbackMessage,
    fetcher = globalThis.fetch,
    timeoutMessage,
    timeoutMs = DEFAULT_API_REQUEST_TIMEOUT_MS,
  }: ApiRequestOptions & {
    fallbackMessage: string;
    timeoutMessage: string;
  },
): Promise<ApiFetchResult> {
  const abortController = new AbortController();
  const timeoutId = globalThis.setTimeout(() => {
    abortController.abort();
  }, timeoutMs);

  try {
    const response = await fetcher(input, {
      ...init,
      signal: abortController.signal,
    });

    return {
      response,
      status: "success",
    };
  } catch (error) {
    return {
      message: isAbortError(error) ? timeoutMessage : fallbackMessage,
      status: "error",
    };
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

export async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isAbortError(error: unknown) {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (isRecord(error) && error.name === "AbortError")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
