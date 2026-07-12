import {
  ANALYSIS_ERROR_MESSAGES,
  type AnalyzeResponse,
} from "@nado/shared/analysis";
import {
  BadGatewayError,
  ServiceUnavailableError,
  UpstreamTimeoutError,
  isHttpError,
} from "../../../shared/errors/httpErrors.js";
import { StructuredOutputError } from "./structuredAnalysisResponse.js";

export type AnalysisProvider = "OpenAI" | "OpenRouter";

export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export async function executeStructuredAnalysisRequest({
  apiKey,
  body,
  endpoint,
  fetchImplementation,
  parseResponse,
  provider,
  timeoutMs,
}: {
  apiKey: string;
  body: unknown;
  endpoint: string;
  fetchImplementation: FetchLike;
  parseResponse(response: Response): Promise<AnalyzeResponse>;
  provider: AnalysisProvider;
  timeoutMs: number;
}): Promise<AnalyzeResponse> {
  if (apiKey.trim().length === 0) {
    throw new ServiceUnavailableError(
      "analysis_provider_configuration_error",
      "분석 서비스를 사용할 수 없어요. 관리자 설정을 확인해 주세요.",
      {
        cause: new Error(`${provider} API key is required.`),
        retryable: false,
      },
    );
  }

  const deadline = createRequestDeadline(timeoutMs);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const remainingTimeoutMs = deadline.readRemainingTimeoutMs();

    if (remainingTimeoutMs <= 0) {
      throw createAnalysisTimeoutError();
    }

    const abortController = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      return await Promise.race([
        executeProviderAttempt({
          apiKey,
          body,
          endpoint,
          fetchImplementation,
          parseResponse,
          provider,
          signal: abortController.signal,
        }),
        new Promise<never>((_resolve, reject) => {
          timeoutId = globalThis.setTimeout(() => {
            abortController.abort();
            reject(createAnalysisTimeoutError());
          }, remainingTimeoutMs);
        }),
      ]);
    } catch (error) {
      if (attempt === 0 && error instanceof StructuredOutputError) {
        continue;
      }

      if (isAbortError(error)) {
        throw createAnalysisTimeoutError(error);
      }

      if (isHttpError(error)) {
        throw error;
      }

      throw new BadGatewayError(
        "analysis_provider_unavailable",
        ANALYSIS_ERROR_MESSAGES.analysis_failed,
        { cause: error, retryable: true },
      );
    } finally {
      if (timeoutId !== undefined) {
        globalThis.clearTimeout(timeoutId);
      }
    }
  }

  throw new BadGatewayError(
    "invalid_analysis_response",
    ANALYSIS_ERROR_MESSAGES.invalid_analysis_response,
    { retryable: true },
  );
}

async function executeProviderAttempt({
  apiKey,
  body,
  endpoint,
  fetchImplementation,
  parseResponse,
  provider,
  signal,
}: {
  apiKey: string;
  body: unknown;
  endpoint: string;
  fetchImplementation: FetchLike;
  parseResponse(response: Response): Promise<AnalyzeResponse>;
  provider: AnalysisProvider;
  signal: AbortSignal;
}): Promise<AnalyzeResponse> {
  const response = await fetchImplementation(endpoint, {
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
    signal,
  });

  if (!response.ok) {
    throw await createProviderHttpError(provider, response);
  }

  return parseResponse(response);
}

async function createProviderHttpError(
  provider: AnalysisProvider,
  response: Response,
) {
  const upstreamError = new Error(
    `${provider} request failed with status ${response.status}${readProviderRequestId(response)}`,
  );

  await discardResponseBody(response);

  if ([400, 401, 403, 404, 422].includes(response.status)) {
    return new ServiceUnavailableError(
      "analysis_provider_configuration_error",
      "분석 서비스를 사용할 수 없어요. 관리자 설정을 확인해 주세요.",
      { cause: upstreamError, retryable: false },
    );
  }

  if (response.status === 429) {
    return new ServiceUnavailableError(
      "analysis_provider_rate_limited",
      "분석 요청이 많아요. 잠시 후 다시 시도해 주세요.",
      { cause: upstreamError, retryable: true },
    );
  }

  return new BadGatewayError(
    "analysis_provider_unavailable",
    ANALYSIS_ERROR_MESSAGES.analysis_failed,
    { cause: upstreamError, retryable: true },
  );
}

async function discardResponseBody(response: Response) {
  try {
    await response.arrayBuffer();
  } catch {
    // The status and request id are enough to classify upstream failures.
  }
}

function readProviderRequestId(response: Response) {
  const requestId =
    response.headers.get("x-request-id") ??
    response.headers.get("x-openai-request-id");

  return requestId ? ` (request ${requestId})` : "";
}

function createRequestDeadline(timeoutMs: number) {
  const expiresAt = Date.now() + timeoutMs;

  return {
    readRemainingTimeoutMs() {
      return Math.max(0, expiresAt - Date.now());
    },
  };
}

function createAnalysisTimeoutError(cause?: unknown) {
  return new UpstreamTimeoutError(
    "analysis_timeout",
    ANALYSIS_ERROR_MESSAGES.analysis_timeout,
    cause,
  );
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "AbortError")
  );
}
