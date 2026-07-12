import {
  ANALYSIS_ERROR_MESSAGES,
  analyzeResponseSchema,
} from "@nado/shared/analysis";
import {
  DEFAULT_ANALYSIS_MODEL_ID,
  isOpenRouterAnalysisModelId,
  type AnalysisModelId,
} from "@nado/shared/analysis-input";
import { mapAnalysisResultToPresentation } from "@nado/shared/analysis-presentation";
import type {
  AnalysisClientError,
  AnalysisClientResult,
} from "@nado/shared/analysis-state";
import { readApiErrorDetail } from "@nado/shared/api-errors";
import {
  fetchWithTimeout,
  readJson,
  type ApiRequestOptions,
} from "../../lib/apiClient";

export type AnalyzeTextResult = AnalysisClientResult;

export type AnalyzeTextOptions = ApiRequestOptions & {
  accessToken?: string | null;
  model?: AnalysisModelId;
};

const ANALYZE_ERROR_MESSAGE = ANALYSIS_ERROR_MESSAGES.analysis_failed;
const ANALYZE_TIMEOUT_MESSAGE = ANALYSIS_ERROR_MESSAGES.analysis_timeout;
const ANALYZE_REQUEST_TIMEOUT_MS = 35_000;
const ANALYZE_OPENROUTER_REQUEST_TIMEOUT_MS = 155_000;

export async function analyzeText(
  text: string,
  options: AnalyzeTextOptions = {},
): Promise<AnalyzeTextResult> {
  const trimmedText = text.trim();
  const model = options.model ?? DEFAULT_ANALYSIS_MODEL_ID;
  const fetchResult = await fetchWithTimeout(
    resolveAnalyzeApiUrl(),
    {
      body: JSON.stringify({
        model,
        text: trimmedText,
      }),
      headers: createAnalyzeHeaders(options.accessToken),
      method: "POST",
    },
    {
      fallbackMessage: ANALYZE_ERROR_MESSAGE,
      fetcher: options.fetcher,
      timeoutMessage: ANALYZE_TIMEOUT_MESSAGE,
      timeoutMs: options.timeoutMs ?? resolveAnalyzeRequestTimeoutMs(model),
    },
  );

  if (fetchResult.status === "error") {
    return fetchResult;
  }

  const { response } = fetchResult;
  const payload = await readJson(response);

  if (!response.ok) {
    return createAnalyzeErrorResult(payload, response.status);
  }

  const parsed = analyzeResponseSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      code: "invalid_analysis_response",
      message: ANALYSIS_ERROR_MESSAGES.invalid_analysis_response,
      retryable: true,
      status: "error",
    };
  }

  if (parsed.data.status === "not_analyzable") {
    return {
      message: parsed.data.reason,
      status: "not_analyzable",
    };
  }

  return {
    data: mapAnalysisResultToPresentation(trimmedText, parsed.data.result),
    status: "success",
  };
}

function createAnalyzeHeaders(accessToken: string | null | undefined) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

function createAnalyzeErrorResult(
  payload: unknown,
  statusCode: number,
): AnalysisClientError {
  const error = readApiErrorDetail(payload, ANALYZE_ERROR_MESSAGE);

  return {
    ...error,
    status: "error",
    statusCode,
  };
}

function resolveAnalyzeRequestTimeoutMs(model: AnalysisModelId): number {
  return isOpenRouterAnalysisModelId(model)
    ? ANALYZE_OPENROUTER_REQUEST_TIMEOUT_MS
    : ANALYZE_REQUEST_TIMEOUT_MS;
}

function resolveAnalyzeApiUrl(): string {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (!apiBaseUrl) {
    return "/api/analyze";
  }

  return `${apiBaseUrl.replace(/\/+$/, "")}/api/analyze`;
}
