import { useEffect, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { MobileSentenceAnalysisCard } from "../components/MobileSentenceAnalysisCard";
import { MobileVocabularySuggestionList } from "../components/MobileVocabularySuggestionList";
import { StatusCard } from "../components/StatusCard";
import {
  MobileVocabularyWordPopover,
  type MobileVocabularyPopoverSelection,
} from "../features/analysis/MobileVocabularyWordPopover";
import { getAnalysisSourceSampleState } from "../features/analysis/analysisScreen";
import { getVisibleMobileTranslationNoteParts } from "../features/analysis/translationNotes";
import type { MobileAnalysisState } from "../features/analysis/useMobileAnalysisController";
import type { MobileVocabularyActions } from "../features/vocabulary/useMobileVocabulary";
import { styles } from "../styles/mobileStyles";

export type { MobileAnalysisState } from "../features/analysis/useMobileAnalysisController";

export function AnalysisResultPanel({
  analysisState,
  getSuggestionState,
  onSaveSuggestion,
}: {
  analysisState: MobileAnalysisState;
  getSuggestionState: MobileVocabularyActions["getSuggestionState"];
  onSaveSuggestion: MobileVocabularyActions["saveSuggestion"];
}) {
  const [selectedVocabularyPopover, setSelectedVocabularyPopover] =
    useState<MobileVocabularyPopoverSelection | null>(null);
  const selectedVocabularyKey = selectedVocabularyPopover?.item.key ?? null;
  const sourceText =
    analysisState.status === "success" ? analysisState.data.sourceText : null;

  useEffect(() => {
    setSelectedVocabularyPopover(null);
  }, [sourceText]);

  if (analysisState.status === "idle") {
    return null;
  }

  if (analysisState.status === "loading") {
    return <StatusCard message="분석 중이에요." title={null} />;
  }

  if (
    analysisState.status === "error" ||
    analysisState.status === "not_analyzable"
  ) {
    return (
      <StatusCard
        message={analysisState.message}
        title="분석 결과"
        tone="error"
      />
    );
  }

  if (analysisState.status !== "success") {
    return null;
  }

  const result = analysisState.data;
  const sourceSample = getAnalysisSourceSampleState(result.sourceText);
  const vocabularyItemByKey = new Map(
    result.vocabularyItems.map((item) => [item.key, item]),
  );

  return (
    <View style={styles.analysisResultStack}>
      <View accessibilityLabel="입력한 문장" style={styles.sourceSample}>
        <Text style={styles.sourceSampleText}>{sourceSample.text}</Text>
        <Text style={styles.sourceSampleCount}>{sourceSample.countLabel}</Text>
      </View>

      <View style={styles.resultArea}>
        <View style={styles.resultHeader}>
          <View style={styles.resultTitleGroup}>
            <Text style={styles.resultTitle}>분석 결과</Text>
          </View>
        </View>

        <View accessibilityLabel="자연스러운 번역" style={styles.resultSection}>
          <Text style={styles.resultTranslation}>{result.translation}</Text>
        </View>

        <ResultSection title="번역 포인트">
          <View style={styles.translationNoteList}>
            {result.translationNotes.map((note) => {
              const display = getVisibleMobileTranslationNoteParts(note);

              if (!display.term && !display.note) {
                return null;
              }

              return (
                <View key={`${note.term}-${note.note}`} style={styles.noteItem}>
                  {display.term ? (
                    <Text style={styles.noteTerm}>{display.term}</Text>
                  ) : null}
                  {display.note ? (
                    <Text style={styles.noteText}>{display.note}</Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        </ResultSection>

        <ResultSection title="문장별 분석">
          <View style={styles.sentenceList}>
            {result.sentences.map((sentence) => (
              <MobileSentenceAnalysisCard
                key={`${sentence.indexLabel}-${sentence.naturalTranslation}`}
                onSelectVocabulary={setSelectedVocabularyPopover}
                selectedVocabularyKey={selectedVocabularyKey}
                sentence={sentence}
                vocabularyItemByKey={vocabularyItemByKey}
              />
            ))}
          </View>
        </ResultSection>

        <ResultSection isLast title="우선 저장 추천">
          <MobileVocabularySuggestionList
            getSuggestionState={getSuggestionState}
            onSaveSuggestion={onSaveSuggestion}
            suggestions={result.vocabularySuggestions}
          />
        </ResultSection>
      </View>
      {selectedVocabularyPopover ? (
        <MobileVocabularyWordPopover
          getSuggestionState={getSuggestionState}
          onClose={() => setSelectedVocabularyPopover(null)}
          onSaveSuggestion={onSaveSuggestion}
          selection={selectedVocabularyPopover}
        />
      ) : null}
    </View>
  );
}

function ResultSection({
  children,
  isLast = false,
  title,
}: {
  children: ReactNode;
  isLast?: boolean;
  title: string;
}) {
  return (
    <View
      style={[styles.resultSection, isLast ? styles.resultSectionLast : null]}
    >
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}
