import type { ReactNode } from "react";
import { Fragment } from "react";
import { Chip } from "./Chip";
import { countVisibleTextCharacters } from "./text";

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
  const visibleCount = count ?? countVisibleTextCharacters(text);

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
  activeVocabularyKey?: string;
  chunks: ReadingChunk[];
  getVocabularySuggestionState?: (
    suggestion: VocabularySuggestion,
  ) => VocabularySuggestionSaveState;
  onSaveVocabularySuggestion?: (suggestion: VocabularySuggestion) => void;
  tokens?: SentenceToken[];
  vocabularyItems?: VocabularyItem[];
}

export function ReadingChunkLine({
  activeVocabularyKey,
  chunks,
  getVocabularySuggestionState,
  onSaveVocabularySuggestion,
  tokens = [],
  vocabularyItems = [],
}: ReadingChunkLineProps) {
  const vocabularyItemByKey = createVocabularyItemMap(vocabularyItems);
  let tokenIndex = 0;

  return (
    <div className="nado-reading-line">
      {chunks.map((chunk, index) => {
        const renderedEnglish = renderVocabularyAwareText({
          activeVocabularyKey,
          getVocabularySuggestionState,
          onSaveVocabularySuggestion,
          onTokenConsumed: (nextTokenIndex) => {
            tokenIndex = nextTokenIndex;
          },
          startTokenIndex: tokenIndex,
          text: chunk.english,
          tokens,
          vocabularyItemByKey,
        });

        return (
          <Fragment key={`${chunk.english}-${chunk.korean}-${index}`}>
            <span className="nado-reading-line__chunk">
              <span className="nado-reading-line__english">
                {renderedEnglish}
              </span>
              <span className="nado-reading-line__korean">{chunk.korean}</span>
            </span>
            {index < chunks.length - 1 ? (
              <span className="nado-reading-line__slash" aria-hidden="true">
                /
              </span>
            ) : null}
          </Fragment>
        );
      })}
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

export interface VocabularySuggestionListProps {
  getSuggestionState?: (
    suggestion: VocabularySuggestion,
  ) => VocabularySuggestionSaveState;
  onSaveSuggestion?: (suggestion: VocabularySuggestion) => void;
  suggestions: VocabularySuggestion[];
}

export function VocabularySuggestionList({
  getSuggestionState,
  onSaveSuggestion,
  suggestions,
}: VocabularySuggestionListProps) {
  const isInteractive = Boolean(onSaveSuggestion);

  return (
    <div className="nado-vocabulary-list">
      {suggestions.map((suggestion) => {
        const state = getSuggestionState?.(suggestion) ?? "idle";

        return (
          <Chip
            aria-label={
              isInteractive
                ? `${suggestion.term}: ${suggestion.meaning} 저장`
                : `${suggestion.term}: ${suggestion.meaning}`
            }
            as={isInteractive ? "button" : "span"}
            disabled={isInteractive ? state !== "idle" : undefined}
            key={`${suggestion.term}-${suggestion.meaning}`}
            label={`${suggestion.term} · ${suggestion.meaning}`}
            onClick={
              onSaveSuggestion ? () => onSaveSuggestion(suggestion) : undefined
            }
            prefix={isInteractive ? getSavePrefix(state) : "+"}
          />
        );
      })}
    </div>
  );
}

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
    <ResultCard
      description="자연스러운 번역, 문장별 끊어읽기 직역, 문법 포인트, 단어 추천을 한 번에 제공합니다."
      meta="200자 이내 기본 분석"
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

function getSavePrefix(state: VocabularySuggestionSaveState) {
  if (state === "saving") {
    return "저장 중";
  }

  if (state === "saved") {
    return "저장됨";
  }

  return "+";
}

interface VocabularyAwareTextOptions {
  activeVocabularyKey?: string;
  getVocabularySuggestionState?: (
    suggestion: VocabularySuggestion,
  ) => VocabularySuggestionSaveState;
  onSaveVocabularySuggestion?: (suggestion: VocabularySuggestion) => void;
  onTokenConsumed: (nextTokenIndex: number) => void;
  startTokenIndex: number;
  text: string;
  tokens: SentenceToken[];
  vocabularyItemByKey: Map<string, VocabularyItem>;
}

const englishWordPattern = /[A-Za-z]+(?:['’-][A-Za-z]+)*/g;

function renderVocabularyAwareText({
  activeVocabularyKey,
  getVocabularySuggestionState,
  onSaveVocabularySuggestion,
  onTokenConsumed,
  startTokenIndex,
  text,
  tokens,
  vocabularyItemByKey,
}: VocabularyAwareTextOptions) {
  const parts: ReactNode[] = [];
  let tokenIndex = startTokenIndex;
  let lastIndex = 0;

  for (const match of text.matchAll(englishWordPattern)) {
    const word = match[0];
    const matchIndex = match.index ?? 0;

    if (matchIndex > lastIndex) {
      parts.push(text.slice(lastIndex, matchIndex));
    }

    const tokenMatch = findMatchingToken(tokens, tokenIndex, word);
    tokenIndex = tokenMatch.nextTokenIndex;
    const vocabularyKey = tokenMatch.token?.vocabularyKey;
    const vocabularyItem = vocabularyKey
      ? vocabularyItemByKey.get(vocabularyKey)
      : undefined;

    if (vocabularyItem) {
      parts.push(
        <VocabularyWordToken
          getVocabularySuggestionState={getVocabularySuggestionState}
          isOpen={vocabularyItem.key === activeVocabularyKey}
          item={vocabularyItem}
          key={`${word}-${matchIndex}`}
          onSaveVocabularySuggestion={onSaveVocabularySuggestion}
          text={word}
        />,
      );
    } else {
      parts.push(word);
    }

    lastIndex = matchIndex + word.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  onTokenConsumed(tokenIndex);
  return parts.length > 0 ? parts : text;
}

interface VocabularyWordTokenProps {
  getVocabularySuggestionState?: (
    suggestion: VocabularySuggestion,
  ) => VocabularySuggestionSaveState;
  isOpen?: boolean;
  item: VocabularyItem;
  onSaveVocabularySuggestion?: (suggestion: VocabularySuggestion) => void;
  text: string;
}

function VocabularyWordToken({
  getVocabularySuggestionState,
  isOpen = false,
  item,
  onSaveVocabularySuggestion,
  text,
}: VocabularyWordTokenProps) {
  const state = getVocabularySuggestionState?.(item) ?? "idle";
  const canSave = Boolean(onSaveVocabularySuggestion);

  return (
    <span
      className={[
        "nado-word-token-wrap",
        isOpen ? "nado-word-token-wrap--open" : undefined,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        aria-expanded={isOpen ? true : undefined}
        aria-label={`${text} 뜻과 저장 액션 보기`}
        className="nado-word-token"
        type="button"
      >
        {text}
      </button>
      <span className="nado-word-popover" role="tooltip">
        <span className="nado-word-popover__header">
          <strong>{item.term}</strong>
          {item.partOfSpeech ? <span>{item.partOfSpeech}</span> : null}
        </span>
        <span className="nado-word-popover__meaning">{item.meaning}</span>
        <span className="nado-word-popover__context">
          {item.contextMeaning}
        </span>
        {canSave ? (
          <button
            aria-label={`${item.term} 저장`}
            className="nado-word-popover__save"
            disabled={state !== "idle"}
            onClick={() => onSaveVocabularySuggestion?.(item)}
            type="button"
          >
            {state === "saving"
              ? "저장 중"
              : state === "saved"
                ? "저장됨"
                : "+ 저장"}
          </button>
        ) : null}
      </span>
    </span>
  );
}

function createVocabularyItemMap(vocabularyItems: VocabularyItem[]) {
  return new Map(vocabularyItems.map((item) => [item.key, item]));
}

function findMatchingToken(
  tokens: SentenceToken[],
  startIndex: number,
  word: string,
) {
  const normalizedWord = normalizeVocabularyMatchText(word);

  for (let index = startIndex; index < tokens.length; index += 1) {
    if (
      normalizeVocabularyMatchText(tokens[index]?.text ?? "") === normalizedWord
    ) {
      return {
        nextTokenIndex: index + 1,
        token: tokens[index],
      };
    }
  }

  return {
    nextTokenIndex: startIndex,
    token: undefined,
  };
}

function normalizeVocabularyMatchText(text: string) {
  return text.normalize("NFKC").toLocaleLowerCase("en-US");
}
