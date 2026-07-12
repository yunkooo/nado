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
} from "@nado/shared/http";
import { apiFetch } from "./apiFetch";

export type AnalyzeTextResult = AnalysisClientResult;

export type AnalyzeTextOptions = ApiRequestOptions & {
  accessToken?: string | null;
  apiBaseUrl?: string;
  model?: AnalysisModelId;
};

const ANALYZE_ERROR_MESSAGE = ANALYSIS_ERROR_MESSAGES.analysis_failed;
const DESKTOP_CONNECTION_ERROR_MESSAGE =
  "분석 서버에 연결할 수 없어요. API 서버 설정을 확인해 주세요.";
const ANALYZE_TIMEOUT_MESSAGE = ANALYSIS_ERROR_MESSAGES.analysis_timeout;
const ANALYZE_REQUEST_TIMEOUT_MS = 35_000;
const ANALYZE_OPENROUTER_REQUEST_TIMEOUT_MS = 155_000;

export async function analyzeText(
  text: string,
  options: AnalyzeTextOptions = {},
): Promise<AnalyzeTextResult> {
  const trimmedText = text.trim();
  const fetcher = options.fetcher ?? apiFetch;

  let fetchResult;

  try {
    const model = options.model ?? DEFAULT_ANALYSIS_MODEL_ID;
    fetchResult = await fetchWithTimeout(
      resolveAnalyzeApiUrl(options.apiBaseUrl),
      {
        body: JSON.stringify({
          model,
          text: trimmedText,
        }),
        headers: createAnalyzeHeaders(options.accessToken),
        method: "POST",
      },
      {
        fallbackMessage: DESKTOP_CONNECTION_ERROR_MESSAGE,
        fetcher,
        timeoutMessage: ANALYZE_TIMEOUT_MESSAGE,
        timeoutMs: options.timeoutMs ?? resolveAnalyzeRequestTimeoutMs(model),
      },
    );
  } catch {
    return {
      message: DESKTOP_CONNECTION_ERROR_MESSAGE,
      status: "error",
    };
  }

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

export function resolveAnalyzeApiUrl(apiBaseUrl: string | undefined) {
  const trimmedBaseUrl = apiBaseUrl?.trim();

  if (!trimmedBaseUrl) {
    return "/api/analyze";
  }

  return `${trimmedBaseUrl.replace(/\/+$/, "")}/api/analyze`;
}

function resolveAnalyzeRequestTimeoutMs(model: AnalysisModelId): number {
  return isOpenRouterAnalysisModelId(model)
    ? ANALYZE_OPENROUTER_REQUEST_TIMEOUT_MS
    : ANALYZE_REQUEST_TIMEOUT_MS;
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

function createAnalyzeHeaders(accessToken: string | null | undefined) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}
