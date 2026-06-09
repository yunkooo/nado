import {
  analyzeResponseSchema,
  type AnalysisResult as ApiAnalysisResult,
} from "@nado/shared";
import type { AnalysisResultData } from "@nado/ui";

type Fetcher = typeof fetch;

export type AnalyzeTextResult =
  | { data: AnalysisResultData; status: "success" }
  | { message: string; status: "error" | "not_analyzable" };

export type AnalyzeTextOptions = {
  accessToken?: string | null;
  fetcher?: Fetcher;
};

const ANALYZE_ERROR_MESSAGE =
  "분석 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.";

export async function analyzeText(
  text: string,
  options: AnalyzeTextOptions = {},
): Promise<AnalyzeTextResult> {
  const trimmedText = text.trim();
  const fetcher = options.fetcher ?? globalThis.fetch;

  let response: Response;

  try {
    response = await fetcher("/api/analyze", {
      body: JSON.stringify({ text: trimmedText }),
      headers: createAnalyzeHeaders(options.accessToken),
      method: "POST",
    });
  } catch {
    return {
      message: ANALYZE_ERROR_MESSAGE,
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

  const parsed = analyzeResponseSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      message: ANALYZE_ERROR_MESSAGE,
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

function createAnalyzeHeaders(accessToken: string | null | undefined) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
