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

export interface VocabularyItem extends VocabularySuggestion {
  baseForm: string;
  contextMeaning: string;
  key: string;
  partOfSpeech: string | null;
}

export type VocabularySuggestionSaveState = "idle" | "saved" | "saving";

export interface AnalysisResultData {
  sentences: SentenceAnalysisItem[];
  sourceText: string;
  translation: string[];
  translationNotes: TranslationNote[];
  vocabularyItems: VocabularyItem[];
  vocabularySuggestions: VocabularySuggestion[];
}

export function isAnalysisResultData(
  value: unknown,
): value is AnalysisResultData {
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

function isVocabularyItems(value: unknown): value is VocabularyItem[] {
  return Array.isArray(value) && value.every(isVocabularyItem);
}

function isVocabularyItem(value: unknown): value is VocabularyItem {
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
