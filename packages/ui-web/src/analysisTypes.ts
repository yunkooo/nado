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
