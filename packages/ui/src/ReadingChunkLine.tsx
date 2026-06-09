import type { ReactNode } from "react";
import { Fragment } from "react";
import type {
  ReadingChunk,
  SentenceToken,
  VocabularyItem,
  VocabularySuggestion,
  VocabularySuggestionSaveState,
} from "./analysisTypes";
import { VocabularyWordToken } from "./VocabularyWordToken";

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
  const renderedChunks = createVocabularyAwareChunks({
    activeVocabularyKey,
    chunks,
    getVocabularySuggestionState,
    onSaveVocabularySuggestion,
    tokens,
    vocabularyItemByKey,
  });

  return (
    <div className="nado-reading-line">
      {renderedChunks.map((chunk, index) => (
        <Fragment key={`${chunk.english}-${chunk.korean}-${index}`}>
          <span className="nado-reading-line__chunk">
            <span className="nado-reading-line__english">
              {chunk.englishParts}
            </span>
            <span className="nado-reading-line__korean">{chunk.korean}</span>
          </span>
          {index < renderedChunks.length - 1 ? (
            <span className="nado-reading-line__slash" aria-hidden="true">
              /
            </span>
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}

type VocabularyAwareChunksOptions = {
  activeVocabularyKey?: string;
  chunks: ReadingChunk[];
  getVocabularySuggestionState?: (
    suggestion: VocabularySuggestion,
  ) => VocabularySuggestionSaveState;
  onSaveVocabularySuggestion?: (suggestion: VocabularySuggestion) => void;
  tokens: SentenceToken[];
  vocabularyItemByKey: Map<string, VocabularyItem>;
};

function createVocabularyAwareChunks({
  activeVocabularyKey,
  chunks,
  getVocabularySuggestionState,
  onSaveVocabularySuggestion,
  tokens,
  vocabularyItemByKey,
}: VocabularyAwareChunksOptions) {
  let tokenIndex = 0;

  return chunks.map((chunk) => {
    const result = renderVocabularyAwareText({
      activeVocabularyKey,
      getVocabularySuggestionState,
      onSaveVocabularySuggestion,
      startTokenIndex: tokenIndex,
      text: chunk.english,
      tokens,
      vocabularyItemByKey,
    });

    tokenIndex = result.nextTokenIndex;

    return {
      english: chunk.english,
      englishParts: result.parts,
      korean: chunk.korean,
    };
  });
}

interface VocabularyAwareTextOptions {
  activeVocabularyKey?: string;
  getVocabularySuggestionState?: (
    suggestion: VocabularySuggestion,
  ) => VocabularySuggestionSaveState;
  onSaveVocabularySuggestion?: (suggestion: VocabularySuggestion) => void;
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

  return {
    nextTokenIndex: tokenIndex,
    parts: parts.length > 0 ? parts : text,
  };
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
