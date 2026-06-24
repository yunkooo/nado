import {
  ANALYSIS_ERROR_MESSAGES,
  DEFAULT_ANALYSIS_MODEL_ID,
  analyzeResponseSchema,
  isOpenRouterAnalysisModelId,
  readApiErrorDetail,
  type AnalysisModelId,
  type AnalysisResult as ApiAnalysisResult,
} from "@nado/shared";
import type { AnalysisResultData } from "@nado/ui";
import {
  fetchWithTimeout,
  readJson,
  type ApiRequestOptions,
} from "../../lib/apiClient";

type AnalyzeTextError = {
  code?: string;
  message: string;
  requestId?: string;
  retryable?: boolean;
  status: "error";
  statusCode?: number;
};

export type AnalyzeTextResult =
  | { data: AnalysisResultData; status: "success" }
  | AnalyzeTextError
  | { message: string; status: "not_analyzable" };

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
    data: mapAnalysisResult(trimmedText, parsed.data.result),
    status: "success",
  };
}

function mapAnalysisResult(
  sourceText: string,
  result: ApiAnalysisResult,
): AnalysisResultData {
  return {
    sentences: result.sentences.map((sentence, index) => ({
      chunks: sentence.chunks.map((chunk) => ({
        english: chunk.english,
        korean: chunk.literalTranslation,
      })),
      grammarPoints: sentence.grammarPoints.map((point) => ({
        explanation: point.explanation,
        target: point.title,
        type: point.grammarType ?? "문법 포인트",
      })),
      indexLabel: `문장 ${index + 1}`,
      naturalTranslation: sentence.translation,
      tokens: sentence.tokens.map((token) => ({
        text: token.text,
        vocabularyKey: token.vocabularyKey,
      })),
    })),
    sourceText,
    translation: [result.translation],
    translationNotes: [
      {
        note: result.translationExplanation,
        term: "번역 포인트",
      },
      ...result.structure.map((item) => ({
        note: `${item.korean} · ${item.note}`,
        term: item.english,
      })),
    ],
    vocabularyItems: result.vocabularyItems.map((item) => ({
      baseForm: item.baseForm,
      contextMeaning: item.contextMeaning,
      key: item.key,
      meaning: item.meaning,
      note: item.contextMeaning,
      partOfSpeech: item.partOfSpeech,
      term: item.term,
      type: item.type,
    })),
    vocabularySuggestions: readVocabularySuggestions(result),
  };
}

function readVocabularySuggestions(result: ApiAnalysisResult) {
  if (result.vocabularySuggestions.length > 0) {
    return result.vocabularySuggestions.map((item) => ({
      meaning: item.meaning,
      note: item.note,
      term: item.term,
      type: item.type,
    }));
  }

  return result.vocabularyItems.map((item) => ({
    meaning: item.meaning,
    note: item.contextMeaning,
    term: item.term,
    type: item.type,
  }));
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
): AnalyzeTextError {
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
