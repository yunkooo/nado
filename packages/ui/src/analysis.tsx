import type { ReactNode } from "react";
import { Fragment } from "react";
import { Chip } from "./Chip";

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
}

export interface VocabularySuggestion {
  meaning: string;
  term: string;
}

export interface AnalysisResultData {
  sentences: SentenceAnalysisItem[];
  sourceText: string;
  translation: string[];
  translationNotes: TranslationNote[];
  vocabularySuggestions: VocabularySuggestion[];
}

export interface InputSampleProps {
  count?: number;
  label?: string;
  maxLength: number;
  text: string;
}

export function InputSample({
  count,
  label = "입력 예시",
  maxLength,
  text,
}: InputSampleProps) {
  const visibleCount = count ?? text.length;

  return (
    <section className="nado-input-sample" aria-label={label}>
      <div className="nado-input-sample__header">
        <span className="nado-eyebrow">{label}</span>
        <span className="nado-compact-label">
          {visibleCount} / {maxLength}
        </span>
      </div>
      <p className="nado-input-sample__text">{text}</p>
    </section>
  );
}

export interface ResultCardProps {
  children: ReactNode;
  description?: string;
  meta?: string;
  title: string;
}

export function ResultCard({
  children,
  description,
  meta,
  title,
}: ResultCardProps) {
  return (
    <article className="nado-result-card">
      <header className="nado-result-card__header">
        <div className="nado-result-card__title-group">
          <h2 className="nado-result-card__title">{title}</h2>
          {description ? (
            <p className="nado-result-card__description">{description}</p>
          ) : null}
        </div>
        {meta ? <span className="nado-result-card__meta">{meta}</span> : null}
      </header>
      <div className="nado-result-card__body">{children}</div>
    </article>
  );
}

export interface SectionProps {
  children: ReactNode;
  title: string;
}

export function Section({ children, title }: SectionProps) {
  return (
    <section className="nado-section">
      <h3 className="nado-section__title">{title}</h3>
      <div className="nado-section__body">{children}</div>
    </section>
  );
}

export interface TranslationBlockProps {
  paragraphs: string[];
}

export function TranslationBlock({ paragraphs }: TranslationBlockProps) {
  return (
    <div className="nado-translation-block">
      {paragraphs.map((paragraph) => (
        <p className="nado-translation-block__paragraph" key={paragraph}>
          {paragraph}
        </p>
      ))}
    </div>
  );
}

export interface TranslationNotesProps {
  notes: TranslationNote[];
}

export function TranslationNotes({ notes }: TranslationNotesProps) {
  return (
    <ul className="nado-note-list">
      {notes.map((note) => (
        <li className="nado-note-list__item" key={`${note.term}-${note.note}`}>
          <strong className="nado-note-list__term">{note.term}</strong>
          <span className="nado-note-list__text">{note.note}</span>
        </li>
      ))}
    </ul>
  );
}

export interface ReadingChunkLineProps {
  chunks: ReadingChunk[];
}

export function ReadingChunkLine({ chunks }: ReadingChunkLineProps) {
  return (
    <div className="nado-reading-line">
      {chunks.map((chunk, index) => (
        <Fragment key={`${chunk.english}-${chunk.korean}-${index}`}>
          <span className="nado-reading-line__chunk">
            <span className="nado-reading-line__english">{chunk.english}</span>
            <span className="nado-reading-line__korean">{chunk.korean}</span>
          </span>
          {index < chunks.length - 1 ? (
            <span className="nado-reading-line__slash" aria-hidden="true">
              /
            </span>
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}

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
  sentence: SentenceAnalysisItem;
}

export function SentenceAnalysis({ sentence }: SentenceAnalysisProps) {
  return (
    <article className="nado-sentence-analysis">
      <div className="nado-sentence-analysis__index">{sentence.indexLabel}</div>
      <div className="nado-sentence-analysis__content">
        <ReadingChunkLine chunks={sentence.chunks} />
        <p className="nado-sentence-analysis__translation">
          {sentence.naturalTranslation}
        </p>
        <GrammarPointList points={sentence.grammarPoints} />
      </div>
    </article>
  );
}

export interface VocabularySuggestionListProps {
  suggestions: VocabularySuggestion[];
}

export function VocabularySuggestionList({
  suggestions,
}: VocabularySuggestionListProps) {
  return (
    <div className="nado-vocabulary-list">
      {suggestions.map((suggestion) => (
        <Chip
          aria-label={`${suggestion.term}: ${suggestion.meaning}`}
          key={`${suggestion.term}-${suggestion.meaning}`}
          label={suggestion.term}
          prefix={suggestion.meaning}
        />
      ))}
    </div>
  );
}

export interface AnalysisResultProps {
  result: AnalysisResultData;
}

export function AnalysisResult({ result }: AnalysisResultProps) {
  const sentenceCount = result.sentences.length;
  const vocabularyCount = result.vocabularySuggestions.length;

  return (
    <ResultCard
      description="문장 구조와 의미 흐름을 학습하기 쉽게 나눴어요."
      meta={`${sentenceCount}문장 · ${vocabularyCount}개 저장 추천`}
      title="분석 결과"
    >
      <Section title="전체 자연스러운 번역">
        <TranslationBlock paragraphs={result.translation} />
      </Section>
      <Section title="번역 포인트">
        <TranslationNotes notes={result.translationNotes} />
      </Section>
      <Section title="문장별 분석">
        <div className="nado-sentence-list">
          {result.sentences.map((sentence) => (
            <SentenceAnalysis
              key={`${sentence.indexLabel}-${sentence.naturalTranslation}`}
              sentence={sentence}
            />
          ))}
        </div>
      </Section>
      <Section title="우선 저장 추천">
        <VocabularySuggestionList suggestions={result.vocabularySuggestions} />
      </Section>
    </ResultCard>
  );
}
