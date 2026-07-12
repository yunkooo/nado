import type { ReactNode } from "react";
import { Text } from "react-native";
import type {
  MobileSentenceAnalysis,
  MobileVocabularyItem,
} from "../api/analysisApi";
import {
  MobileVocabularyWordToken,
  type MobileVocabularySelectionHandler,
} from "../features/analysis/MobileVocabularyWordPopover";
import { findMatchingMobileSentenceToken } from "../features/analysis/mobileVocabularyTokenMatch";
import { styles } from "../styles/mobileStyles";

const englishWordPattern = /[A-Za-z]+(?:['’-][A-Za-z]+)*/g;

export function renderMobileVocabularyAwareText({
  onSelectVocabulary,
  selectedVocabularyKey,
  startTokenIndex,
  text,
  tokens,
  vocabularyItemByKey,
}: {
  onSelectVocabulary: MobileVocabularySelectionHandler;
  selectedVocabularyKey: string | null;
  startTokenIndex: number;
  text: string;
  tokens: MobileSentenceAnalysis["tokens"];
  vocabularyItemByKey: Map<string, MobileVocabularyItem>;
}) {
  const parts: ReactNode[] = [];
  let selectedVocabularyItem: MobileVocabularyItem | null = null;
  let tokenIndex = startTokenIndex;
  let lastIndex = 0;

  for (const match of text.matchAll(englishWordPattern)) {
    const word = match[0];
    const matchIndex = match.index ?? 0;

    if (matchIndex > lastIndex) {
      parts.push(
        <Text
          key={`plain-${lastIndex}-${matchIndex}`}
          style={styles.chunkEnglish}
        >
          {text.slice(lastIndex, matchIndex)}
        </Text>,
      );
    }

    const tokenMatch = findMatchingMobileSentenceToken(
      tokens,
      tokenIndex,
      word,
    );
    tokenIndex = tokenMatch.nextTokenIndex;
    const vocabularyKey = tokenMatch.token?.vocabularyKey;
    const vocabularyItem = vocabularyKey
      ? vocabularyItemByKey.get(vocabularyKey)
      : undefined;

    if (vocabularyItem) {
      const isSelected = vocabularyItem.key === selectedVocabularyKey;

      if (isSelected) {
        selectedVocabularyItem = vocabularyItem;
      }

      parts.push(
        <MobileVocabularyWordToken
          accessibilityLabel={`${word} 뜻과 저장 액션 보기`}
          isSelected={isSelected}
          item={vocabularyItem}
          key={`word-${word}-${matchIndex}`}
          onSelectVocabulary={onSelectVocabulary}
          text={word}
        />,
      );
    } else {
      parts.push(
        <Text key={`word-${word}-${matchIndex}`} style={styles.chunkEnglish}>
          {word}
        </Text>,
      );
    }

    lastIndex = matchIndex + word.length;
  }

  if (lastIndex < text.length) {
    parts.push(
      <Text
        key={`plain-${lastIndex}-${text.length}`}
        style={styles.chunkEnglish}
      >
        {text.slice(lastIndex)}
      </Text>,
    );
  }

  return {
    nextTokenIndex: tokenIndex,
    parts:
      parts.length > 0 ? (
        parts
      ) : (
        <Text style={styles.chunkEnglish}>{text}</Text>
      ),
    selectedVocabularyItem,
  };
}
