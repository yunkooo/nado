import {
  ANALYSIS_ERROR_MESSAGES,
  analyzeResponseSchema,
} from "@nado/shared/analysis";
import {
  DEFAULT_ANALYSIS_MODEL_ID,
  isOpenRouterAnalysisModelId,
  normalizeAnalysisText,
  type AnalysisModelId,
} from "@nado/shared/analysis-input";
import {
  mapAnalysisResultToPresentation,
  type AnalysisPresentationResult,
  type AnalysisPresentationVocabularyItem,
  type GrammarPoint,
  type ReadingChunk,
  type SentenceAnalysisItem,
  type SentenceToken,
  type TranslationNote,
  type VocabularySuggestion,
} from "@nado/shared/analysis-presentation";
import type { AnalysisClientError } from "@nado/shared/analysis-state";
import { readApiErrorDetail } from "@nado/shared/api-errors";
import {
  fetchWithTimeout,
  readJson,
  type ApiRequestOptions,
} from "@nado/shared/http";
import {
  MOBILE_API_CONFIGURATION_ERROR_MESSAGE,
  MobileApiConfigurationError,
  resolveMobileApiUrl,
  type MobileApiPlatform,
} from "./apiConfig";

export type MobileAnalysisSummary = Omit<
  AnalysisPresentationResult,
  "translation"
> & {
  sentenceCountLabel: string;
  translation: string;
  vocabularyCountLabel: string;
};

export type MobileReadingChunk = ReadingChunk;
export type MobileTranslationNote = TranslationNote;
export type MobileGrammarPoint = GrammarPoint;
export type MobileSentenceAnalysis = SentenceAnalysisItem;
export type MobileSentenceToken = SentenceToken;
export type MobileVocabularySuggestion = VocabularySuggestion;
export type MobileVocabularyItem = AnalysisPresentationVocabularyItem;

export type AnalyzeTextResult =
  | { data: MobileAnalysisSummary; status: "success" }
  | AnalysisClientError
  | { message: string; status: "not_analyzable" };

export type AnalyzeTextOptions = ApiRequestOptions & {
  accessToken?: string | null;
  apiBaseUrl?: string;
  apiPlatform?: MobileApiPlatform | string;
  model?: AnalysisModelId;
};

const ANALYZE_ERROR_MESSAGE = ANALYSIS_ERROR_MESSAGES.analysis_failed;
const MOBILE_CONNECTION_ERROR_MESSAGE =
  "분석 서버에 연결할 수 없어요. API 서버 설정을 확인해 주세요.";
const ANALYZE_TIMEOUT_MESSAGE = ANALYSIS_ERROR_MESSAGES.analysis_timeout;
const ANALYZE_REQUEST_TIMEOUT_MS = 35_000;
const ANALYZE_OPENROUTER_REQUEST_TIMEOUT_MS = 155_000;

export async function analyzeText(
  text: string,
  options: AnalyzeTextOptions = {},
): Promise<AnalyzeTextResult> {
  const trimmedText = normalizeAnalysisText(text);
  const fetcher = options.fetcher ?? globalThis.fetch;

  let fetchResult;

  try {
    const model = options.model ?? DEFAULT_ANALYSIS_MODEL_ID;
    fetchResult = await fetchWithTimeout(
      resolveAnalyzeApiUrl(options.apiBaseUrl, options.apiPlatform),
      {
        body: JSON.stringify({
          model,
          text: trimmedText,
        }),
        headers: createAnalyzeHeaders(options.accessToken),
        method: "POST",
      },
      {
        fallbackMessage: MOBILE_CONNECTION_ERROR_MESSAGE,
        fetcher,
        timeoutMessage: ANALYZE_TIMEOUT_MESSAGE,
        timeoutMs: options.timeoutMs ?? resolveAnalyzeRequestTimeoutMs(model),
      },
    );
  } catch (error) {
    return {
      message:
        error instanceof MobileApiConfigurationError
          ? MOBILE_API_CONFIGURATION_ERROR_MESSAGE
          : MOBILE_CONNECTION_ERROR_MESSAGE,
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
    data: mapAnalysisResultToMobilePresentation(
      trimmedText,
      parsed.data.result,
    ),
    status: "success",
  };
}

export function resolveAnalyzeApiUrl(
  apiBaseUrl: string | undefined,
  apiPlatform?: MobileApiPlatform | string,
) {
  return resolveMobileApiUrl("/api/analyze", apiBaseUrl, {
    platform: apiPlatform,
  });
}

function resolveAnalyzeRequestTimeoutMs(model: AnalysisModelId): number {
  return isOpenRouterAnalysisModelId(model)
    ? ANALYZE_OPENROUTER_REQUEST_TIMEOUT_MS
    : ANALYZE_REQUEST_TIMEOUT_MS;
}

function mapAnalysisResultToMobilePresentation(
  sourceText: string,
  result: Parameters<typeof mapAnalysisResultToPresentation>[1],
): MobileAnalysisSummary {
  const presentation = mapAnalysisResultToPresentation(sourceText, result);

  return {
    ...presentation,
    sentenceCountLabel: `문장 ${presentation.sentences.length}개`,
    translation: presentation.translation[0] ?? "",
    vocabularyCountLabel: `저장 후보 ${presentation.vocabularySuggestions.length}개`,
  };
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
