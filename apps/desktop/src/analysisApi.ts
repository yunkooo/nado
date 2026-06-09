import type { AnalysisResult as ApiAnalysisResult } from "@nado/shared";
import type { AnalysisResultData } from "@nado/ui";

type Fetcher = typeof fetch;

export type AnalyzeTextResult =
  | { data: AnalysisResultData; status: "success" }
  | { message: string; status: "error" | "not_analyzable" };

export type AnalyzeTextOptions = {
  apiBaseUrl?: string;
  fetcher?: Fetcher;
};

const ANALYZE_ERROR_MESSAGE =
  "분석 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.";
const DESKTOP_CONNECTION_ERROR_MESSAGE =
  "분석 서버에 연결할 수 없어요. API 서버 설정을 확인해 주세요.";

export async function analyzeText(
  text: string,
  options: AnalyzeTextOptions = {},
): Promise<AnalyzeTextResult> {
  const trimmedText = text.trim();
  const fetcher = options.fetcher ?? globalThis.fetch;

  let response: Response;

  try {
    response = await fetcher(resolveAnalyzeApiUrl(options.apiBaseUrl), {
      body: JSON.stringify({ text: trimmedText }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  } catch {
    return {
      message: DESKTOP_CONNECTION_ERROR_MESSAGE,
      status: "error",
    };
  }

  const payload = await readJson(response);

  if (!response.ok) {
    return {
      message: readErrorMessage(payload),
      status: "error",
    };
  }

  if (isRecord(payload) && payload.status === "not_analyzable") {
    return {
      message:
        typeof payload.reason === "string"
          ? payload.reason
          : "영어 문장으로 분석하기 어려워요. 한 문장 또는 짧은 문단을 입력해 주세요.",
      status: "not_analyzable",
    };
  }

  if (
    isRecord(payload) &&
    payload.status === "analyzable" &&
    isApiAnalysisResult(payload.result)
  ) {
    return {
      data: mapAnalysisResult(trimmedText, payload.result),
      status: "success",
    };
  }

  return {
    message: ANALYZE_ERROR_MESSAGE,
    status: "error",
  };
}

export function resolveAnalyzeApiUrl(apiBaseUrl: string | undefined) {
  const trimmedBaseUrl = apiBaseUrl?.trim();

  if (!trimmedBaseUrl) {
    return "/api/analyze";
  }

  return `${trimmedBaseUrl.replace(/\/+$/, "")}/api/analyze`;
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

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function readErrorMessage(payload: unknown): string {
  if (isRecord(payload) && isRecord(payload.error)) {
    return typeof payload.error.message === "string"
      ? payload.error.message
      : ANALYZE_ERROR_MESSAGE;
  }

  return ANALYZE_ERROR_MESSAGE;
}

function isApiAnalysisResult(value: unknown): value is ApiAnalysisResult {
  return (
    isRecord(value) &&
    typeof value.translation === "string" &&
    typeof value.translationExplanation === "string" &&
    Array.isArray(value.sentences) &&
    Array.isArray(value.structure) &&
    Array.isArray(value.vocabularyItems) &&
    Array.isArray(value.vocabularySuggestions)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
