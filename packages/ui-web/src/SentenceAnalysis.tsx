import { ReadingChunkLine } from "./ReadingChunkLine";
import type {
  GrammarPoint,
  SentenceAnalysisItem,
  VocabularyItem,
  VocabularySuggestion,
  VocabularySuggestionSaveState,
} from "./analysisTypes";

export interface GrammarPointListProps {
  points: GrammarPoint[];
}

export function GrammarPointList({ points }: GrammarPointListProps) {
  return (
    <ul className="nado-grammar-list">
      {points.map((point) => (
        <li
          className="nado-grammar-list__item"
          key={`${point.target}-${point.type}`}
        >
          <span className="nado-grammar-list__label">
            <strong>{point.target}</strong>
            <span>{point.type}</span>
          </span>
          <span className="nado-grammar-list__text">{point.explanation}</span>
        </li>
      ))}
    </ul>
  );
}

export interface SentenceAnalysisProps {
  activeVocabularyKey?: string;
  getVocabularySuggestionState?: (
    suggestion: VocabularySuggestion,
  ) => VocabularySuggestionSaveState;
  onSaveVocabularySuggestion?: (suggestion: VocabularySuggestion) => void;
  sentence: SentenceAnalysisItem;
  vocabularyItems?: VocabularyItem[];
}

export function SentenceAnalysis({
  activeVocabularyKey,
  getVocabularySuggestionState,
  onSaveVocabularySuggestion,
  sentence,
  vocabularyItems,
}: SentenceAnalysisProps) {
  return (
    <article className="nado-sentence-analysis">
      <div className="nado-sentence-analysis__index">{sentence.indexLabel}</div>
      <div className="nado-sentence-analysis__content">
        <ReadingChunkLine
          activeVocabularyKey={activeVocabularyKey}
          chunks={sentence.chunks}
          getVocabularySuggestionState={getVocabularySuggestionState}
          onSaveVocabularySuggestion={onSaveVocabularySuggestion}
          tokens={sentence.tokens}
          vocabularyItems={vocabularyItems}
        />
        <p className="nado-sentence-analysis__translation">
          {sentence.naturalTranslation}
        </p>
        <GrammarPointList points={sentence.grammarPoints} />
      </div>
    </article>
  );
}
