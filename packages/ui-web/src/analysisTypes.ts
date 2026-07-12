// Compatibility export for existing UI consumers. The presentation contract
// lives in @nado/shared so API adapters and persisted state do not depend on a
// React package.
export {
  isAnalysisResultData,
  isAnalysisPresentationResult,
  type AnalysisPresentationResult,
  type AnalysisResultData,
  type AnalysisPresentationVocabularyItem,
  type GrammarPoint,
  type ReadingChunk,
  type SentenceAnalysisItem,
  type SentenceToken,
  type TranslationNote,
  type VocabularySuggestion,
  type VocabularySuggestionSaveState,
} from "@nado/shared/analysis-presentation";

export type { AnalysisPresentationVocabularyItem as VocabularyItem } from "@nado/shared/analysis-presentation";
