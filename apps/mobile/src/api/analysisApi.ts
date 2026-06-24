import {
  ANALYSIS_ERROR_MESSAGES,
  DEFAULT_ANALYSIS_MODEL_ID,
  analyzeResponseSchema,
  normalizeAnalysisText,
  readApiErrorDetail,
  type AnalysisModelId,
  type AnalysisResult as ApiAnalysisResult,
} from "@nado/shared";
import {
  MOBILE_API_CONFIGURATION_ERROR_MESSAGE,
  MobileApiConfigurationError,
  resolveMobileApiUrl,
  type MobileApiPlatform,
} from "./apiConfig";

type Fetcher = typeof fetch;

type AnalyzeTextError = {
  code?: string;
  message: string;
  requestId?: string;
  retryable?: boolean;
  status: "error";
  statusCode?: number;
};

export type MobileAnalysisSummary = {
  sentences: MobileSentenceAnalysis[];
  sentenceCountLabel: string;
  sourceText: string;
  translation: string;
  translationNotes: MobileTranslationNote[];
  vocabularyCountLabel: string;
  vocabularyItems: MobileVocabularyItem[];
  vocabularySuggestions: MobileVocabularySuggestion[];
};

export type MobileReadingChunk = {
  english: string;
  korean: string;
};

export type MobileTranslationNote = {
  note: string;
  term: string;
};

export type MobileGrammarPoint = {
  explanation: string;
  target: string;
  type: string;
};

export type MobileSentenceAnalysis = {
  chunks: MobileReadingChunk[];
  grammarPoints: MobileGrammarPoint[];
  indexLabel: string;
  naturalTranslation: string;
  tokens: MobileSentenceToken[];
};

export type MobileSentenceToken = {
  text: string;
  vocabularyKey: string | null;
};

export type MobileVocabularySuggestion = {
  meaning: string;
  note?: string;
  term: string;
  type: "phrase" | "word";
};

export type MobileVocabularyItem = MobileVocabularySuggestion & {
  baseForm: string;
  contextMeaning: string;
  key: string;
  partOfSpeech: string | null;
};

export type AnalyzeTextResult =
  | { data: MobileAnalysisSummary; status: "success" }
  | AnalyzeTextError
  | { message: string; status: "not_analyzable" };

export type AnalyzeTextOptions = {
  accessToken?: string | null;
  apiBaseUrl?: string;
  apiPlatform?: MobileApiPlatform | string;
  fetcher?: Fetcher;
  model?: AnalysisModelId;
};

const ANALYZE_ERROR_MESSAGE = ANALYSIS_ERROR_MESSAGES.analysis_failed;
const MOBILE_CONNECTION_ERROR_MESSAGE =
  "분석 서버에 연결할 수 없어요. API 서버 설정을 확인해 주세요.";

export async function analyzeText(
  text: string,
  options: AnalyzeTextOptions = {},
): Promise<AnalyzeTextResult> {
  const trimmedText = normalizeAnalysisText(text);
  const fetcher = options.fetcher ?? globalThis.fetch;

  let response: Response;

  try {
    response = await fetcher(
      resolveAnalyzeApiUrl(options.apiBaseUrl, options.apiPlatform),
      {
        body: JSON.stringify({
          model: options.model ?? DEFAULT_ANALYSIS_MODEL_ID,
          text: trimmedText,
        }),
        headers: createAnalyzeHeaders(options.accessToken),
        method: "POST",
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

export function resolveAnalyzeApiUrl(
  apiBaseUrl: string | undefined,
  apiPlatform?: MobileApiPlatform | string,
) {
  return resolveMobileApiUrl("/api/analyze", apiBaseUrl, {
    platform: apiPlatform,
  });
}

function mapAnalysisResult(
  sourceText: string,
  result: ApiAnalysisResult,
): MobileAnalysisSummary {
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
    sentenceCountLabel: `문장 ${result.sentences.length}개`,
    sourceText,
    translation: result.translation,
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
    vocabularyCountLabel: `저장 후보 ${readVocabularyCount(result)}개`,
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

function readVocabularyCount(result: ApiAnalysisResult) {
  return result.vocabularySuggestions.length > 0
    ? result.vocabularySuggestions.length
    : result.vocabularyItems.length;
}

function readVocabularySuggestions(
  result: ApiAnalysisResult,
): MobileVocabularySuggestion[] {
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

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
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

function createAnalyzeHeaders(accessToken: string | null | undefined) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}
