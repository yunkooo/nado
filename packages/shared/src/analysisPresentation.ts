import type { AnalysisResult } from "./analysisContracts.ts";

export interface ReadingChunk {
  english: string;
  korean: string;
}

export interface TranslationNote {
  term: string;
  note: string;
}

export interface GrammarPoint {
  target: string;
  type: string;
  explanation: string;
}

export interface SentenceAnalysisItem {
  chunks: ReadingChunk[];
  grammarPoints: GrammarPoint[];
  indexLabel: string;
  naturalTranslation: string;
  tokens: SentenceToken[];
}

export interface SentenceToken {
  text: string;
  vocabularyKey: string | null;
}

export interface VocabularySuggestion {
  meaning: string;
  note?: string;
  term: string;
  type: "phrase" | "word";
}

export interface AnalysisPresentationVocabularyItem extends VocabularySuggestion {
  baseForm: string;
  contextMeaning: string;
  key: string;
  partOfSpeech: string | null;
}

export type VocabularySuggestionSaveState = "idle" | "saved" | "saving";

/**
 * API analysis data normalized for every client presentation.
 *
 * UI packages consume this contract, but do not own it. Keeping the contract
 * here prevents application state and API adapters from depending on a React
 * presentation package just to validate persisted data.
 */
export interface AnalysisPresentationResult {
  sentences: SentenceAnalysisItem[];
  sourceText: string;
  translation: string[];
  translationNotes: TranslationNote[];
  vocabularyItems: AnalysisPresentationVocabularyItem[];
  vocabularySuggestions: VocabularySuggestion[];
}

/** @deprecated Prefer AnalysisPresentationResult in non-UI code. */
export type AnalysisResultData = AnalysisPresentationResult;

/** @deprecated Prefer AnalysisPresentationVocabularyItem in non-UI code. */
export type VocabularyItem = AnalysisPresentationVocabularyItem;

export function mapAnalysisResultToPresentation(
  sourceText: string,
  result: AnalysisResult,
): AnalysisPresentationResult {
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

export function isAnalysisPresentationResult(
  value: unknown,
): value is AnalysisPresentationResult {
  return (
    isRecord(value) &&
    typeof value.sourceText === "string" &&
    isStringArray(value.translation) &&
    isTranslationNotes(value.translationNotes) &&
    isSentenceAnalysisItems(value.sentences) &&
    isVocabularyItems(value.vocabularyItems) &&
    isVocabularySuggestions(value.vocabularySuggestions)
  );
}

/** @deprecated Prefer isAnalysisPresentationResult in non-UI code. */
export const isAnalysisResultData = isAnalysisPresentationResult;

function readVocabularySuggestions(
  result: AnalysisResult,
): VocabularySuggestion[] {
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

function isTranslationNotes(value: unknown): value is TranslationNote[] {
  return (
    Array.isArray(value) &&
    value.every(
      (note) =>
        isRecord(note) &&
        typeof note.term === "string" &&
        typeof note.note === "string",
    )
  );
}

function isSentenceAnalysisItems(
  value: unknown,
): value is SentenceAnalysisItem[] {
  return (
    Array.isArray(value) &&
    value.every(
      (sentence) =>
        isRecord(sentence) &&
        typeof sentence.indexLabel === "string" &&
        typeof sentence.naturalTranslation === "string" &&
        isReadingChunks(sentence.chunks) &&
        isGrammarPoints(sentence.grammarPoints) &&
        isSentenceTokens(sentence.tokens),
    )
  );
}

function isReadingChunks(value: unknown): value is ReadingChunk[] {
  return (
    Array.isArray(value) &&
    value.every(
      (chunk) =>
        isRecord(chunk) &&
        typeof chunk.english === "string" &&
        typeof chunk.korean === "string",
    )
  );
}

function isGrammarPoints(value: unknown): value is GrammarPoint[] {
  return (
    Array.isArray(value) &&
    value.every(
      (point) =>
        isRecord(point) &&
        typeof point.target === "string" &&
        typeof point.type === "string" &&
        typeof point.explanation === "string",
    )
  );
}

function isSentenceTokens(value: unknown): value is SentenceToken[] {
  return (
    Array.isArray(value) &&
    value.every(
      (token) =>
        isRecord(token) &&
        typeof token.text === "string" &&
        (token.vocabularyKey === null ||
          typeof token.vocabularyKey === "string"),
    )
  );
}

function isVocabularyItems(
  value: unknown,
): value is AnalysisPresentationVocabularyItem[] {
  return Array.isArray(value) && value.every(isVocabularyItem);
}

function isVocabularyItem(
  value: unknown,
): value is AnalysisPresentationVocabularyItem {
  return (
    isRecord(value) &&
    typeof value.baseForm === "string" &&
    typeof value.contextMeaning === "string" &&
    typeof value.key === "string" &&
    (value.partOfSpeech === null || typeof value.partOfSpeech === "string") &&
    isVocabularySuggestion(value)
  );
}

function isVocabularySuggestions(
  value: unknown,
): value is VocabularySuggestion[] {
  return Array.isArray(value) && value.every(isVocabularySuggestion);
}

function isVocabularySuggestion(value: unknown): value is VocabularySuggestion {
  return (
    isRecord(value) &&
    typeof value.term === "string" &&
    typeof value.meaning === "string" &&
    (value.type === "phrase" || value.type === "word") &&
    (value.note === undefined || typeof value.note === "string")
  );
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
