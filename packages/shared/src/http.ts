export type ApiFetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type ApiRequestOptions = {
  fetcher?: ApiFetcher;
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

export const DEFAULT_API_REQUEST_TIMEOUT_MS = 10_000;

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
  const externalSignal = init.signal;
  const abortFromExternalSignal = () => abortController.abort();

  if (externalSignal?.aborted) {
    abortFromExternalSignal();
  } else {
    externalSignal?.addEventListener("abort", abortFromExternalSignal, {
      once: true,
    });
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    const response = await Promise.race([
      Promise.resolve().then(() =>
        fetcher(input, {
          ...init,
          signal: abortController.signal,
        }),
      ),
      new Promise<Response>((_resolve, reject) => {
        timeoutId = globalThis.setTimeout(
          () => {
            abortController.abort();
            reject(new ApiRequestTimeoutError());
          },
          Math.max(0, timeoutMs),
        );
      }),
    ]);

    return {
      response,
      status: "success",
    };
  } catch (error) {
    return {
      message:
        error instanceof ApiRequestTimeoutError ||
        (isAbortError(error) && !externalSignal?.aborted)
          ? timeoutMessage
          : fallbackMessage,
      status: "error",
    };
  } finally {
    if (timeoutId !== undefined) {
      globalThis.clearTimeout(timeoutId);
    }

    externalSignal?.removeEventListener("abort", abortFromExternalSignal);
  }
}

export async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

class ApiRequestTimeoutError extends Error {}

function isAbortError(error: unknown) {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "AbortError")
  );
}
