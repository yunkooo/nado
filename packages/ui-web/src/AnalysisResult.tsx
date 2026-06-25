import {
  ResultCard,
  Section,
  TranslationBlock,
  TranslationNotes,
} from "./analysisPrimitives";
import { SentenceAnalysis } from "./SentenceAnalysis";
import type {
  AnalysisResultData,
  VocabularySuggestion,
  VocabularySuggestionSaveState,
} from "./analysisTypes";
import { VocabularySuggestionList } from "./VocabularySuggestionList";

export interface AnalysisResultProps {
  activeVocabularyKey?: string;
  getVocabularySuggestionState?: (
    suggestion: VocabularySuggestion,
  ) => VocabularySuggestionSaveState;
  onSaveVocabularySuggestion?: (suggestion: VocabularySuggestion) => void;
  result: AnalysisResultData;
}

export function AnalysisResult({
  activeVocabularyKey,
  getVocabularySuggestionState,
  onSaveVocabularySuggestion,
  result,
}: AnalysisResultProps) {
  return (
    <ResultCard title="분석 결과">
      <section aria-label="자연스러운 번역" className="nado-section">
        <div className="nado-section__body">
          <TranslationBlock paragraphs={result.translation} />
        </div>
      </section>
      <Section title="번역 포인트">
        <TranslationNotes notes={result.translationNotes} />
      </Section>
      <Section title="문장별 분석">
        <div className="nado-sentence-list">
          {result.sentences.map((sentence) => (
            <SentenceAnalysis
              activeVocabularyKey={activeVocabularyKey}
              getVocabularySuggestionState={getVocabularySuggestionState}
              key={`${sentence.indexLabel}-${sentence.naturalTranslation}`}
              onSaveVocabularySuggestion={onSaveVocabularySuggestion}
              sentence={sentence}
              vocabularyItems={result.vocabularyItems}
            />
          ))}
        </div>
      </Section>
      <Section title="우선 저장 추천">
        <VocabularySuggestionList
          getSuggestionState={getVocabularySuggestionState}
          onSaveSuggestion={onSaveVocabularySuggestion}
          suggestions={result.vocabularySuggestions}
        />
      </Section>
    </ResultCard>
  );
}
