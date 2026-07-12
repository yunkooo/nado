import { Fragment } from "react";
import { Text, View } from "react-native";
import type {
  MobileSentenceAnalysis,
  MobileVocabularyItem,
} from "../api/analysisApi";
import type { MobileVocabularySelectionHandler } from "../features/analysis/MobileVocabularyWordPopover";
import { styles } from "../styles/mobileStyles";
import { renderMobileVocabularyAwareText } from "./MobileVocabularyAwareText";

export function MobileSentenceAnalysisCard({
  onSelectVocabulary,
  selectedVocabularyKey,
  sentence,
  vocabularyItemByKey,
}: {
  onSelectVocabulary: MobileVocabularySelectionHandler;
  selectedVocabularyKey: string | null;
  sentence: MobileSentenceAnalysis;
  vocabularyItemByKey: Map<string, MobileVocabularyItem>;
}) {
  let tokenIndex = 0;
  const isSelectedSentence = Boolean(
    selectedVocabularyKey &&
    sentence.tokens.some(
      (token) => token.vocabularyKey === selectedVocabularyKey,
    ),
  );

  return (
    <View
      style={[
        styles.sentenceCard,
        isSelectedSentence ? styles.sentenceCardActive : null,
      ]}
    >
      <Text style={styles.sentenceIndex}>{sentence.indexLabel}</Text>
      <View style={styles.chunkLine}>
        {sentence.chunks.map((chunk, index) => {
          const renderedText = renderMobileVocabularyAwareText({
            onSelectVocabulary,
            selectedVocabularyKey,
            startTokenIndex: tokenIndex,
            text: chunk.english,
            tokens: sentence.tokens,
            vocabularyItemByKey,
          });
          tokenIndex = renderedText.nextTokenIndex;

          return (
            <Fragment key={`${chunk.english}-${chunk.korean}-${index}`}>
              <View
                style={[
                  styles.chunkUnit,
                  renderedText.selectedVocabularyItem
                    ? styles.chunkUnitActive
                    : null,
                ]}
              >
                <View style={styles.chunkContent}>
                  <View style={styles.chunkEnglishLine}>
                    {renderedText.parts}
                  </View>
                  <Text style={styles.chunkKorean}>{chunk.korean}</Text>
                </View>
              </View>
              {index < sentence.chunks.length - 1 ? (
                <Text accessibilityElementsHidden style={styles.chunkSlash}>
                  /
                </Text>
              ) : null}
            </Fragment>
          );
        })}
      </View>
      <Text style={styles.sentenceTranslation}>
        {sentence.naturalTranslation}
      </Text>
      {sentence.grammarPoints.length > 0 ? (
        <View style={styles.grammarList}>
          {sentence.grammarPoints.map((point) => (
            <View
              key={`${point.target}-${point.explanation}`}
              style={styles.grammarItem}
            >
              <Text style={styles.grammarTarget}>{point.target}</Text>
              <View style={styles.grammarDescription}>
                <Text style={styles.grammarType}>{point.type}</Text>
                <Text style={styles.grammarExplanation}>
                  {point.explanation}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
