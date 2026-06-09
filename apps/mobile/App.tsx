import { useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MAX_ANALYSIS_TEXT_LENGTH } from "@nado/shared";
import {
  ANALYSIS_INPUT_ACCESSIBILITY_LABEL,
  INITIAL_ANALYSIS_TEXT,
  getAnalysisComposerState,
  mobileReviewCards,
  mobileReviewDirections,
  mobileReviewFlashcard,
  mobileTabs,
  mobileVocabularyItems,
  mobileVocabularySummary,
  shouldShowAnalysisResult,
} from "./src/analysisScreen";
import type { MobileTabKey } from "./src/analysisScreen";

const mobileColors = {
  canvas: "#f1f1ed",
  surface: "#ffffff",
  surfaceMuted: "#f7f7f4",
  sidebar: "#e9e9e4",
  sidebarActive: "#d9d9d2",
  ink: "#20201d",
  inkMuted: "#6f6f68",
  border: "#e7e7e2",
  primary: "#26365f",
  primaryInk: "#ffffff",
} as const;

export default function App() {
  const [text, setText] = useState(INITIAL_ANALYSIS_TEXT);
  const [submittedText, setSubmittedText] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MobileTabKey>("analysis");
  const composerState = getAnalysisComposerState(text);
  const shouldShowResult = shouldShowAnalysisResult(text, submittedText);

  const handleAnalyzePress = () => {
    const trimmedText = text.trim();

    if (trimmedText.length === 0) {
      return;
    }

    setSubmittedText(trimmedText);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.shell}>
        <View style={styles.topbar}>
          <View style={styles.brandGroup}>
            <Text style={styles.logo}>nado</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            disabled
            style={({ pressed }) => [
              styles.loginButton,
              styles.loginButtonDisabled,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.loginButtonText}>Google 로그인</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {activeTab === "analysis" ? (
            shouldShowResult ? (
              <View style={styles.resultArea}>
                <Text style={styles.resultTitle}>분석 결과</Text>
                <Text style={styles.emptyText}>
                  자연스러운 번역, 번역 포인트, 문장별 분석이 이곳에 표시됩니다.
                </Text>
              </View>
            ) : null
          ) : null}
          {activeTab === "vocabulary" ? <VocabularyPage /> : null}
          {activeTab === "review" ? <ReviewPage /> : null}
        </ScrollView>

        <View style={styles.bottomArea}>
          {activeTab === "analysis" ? (
            <View style={styles.composer}>
              {composerState.helperText ? (
                <Text style={styles.helperText}>
                  {composerState.helperText}
                </Text>
              ) : null}
              <TextInput
                accessibilityLabel={ANALYSIS_INPUT_ACCESSIBILITY_LABEL}
                multiline
                maxLength={MAX_ANALYSIS_TEXT_LENGTH}
                onChangeText={setText}
                placeholder={composerState.placeholderText}
                placeholderTextColor={mobileColors.inkMuted}
                style={styles.input}
                textAlignVertical="top"
                value={text}
              />
              <View style={styles.composerFooter}>
                <Text style={styles.count}>{composerState.countLabel}</Text>
                <Pressable
                  accessibilityRole="button"
                  disabled={composerState.isSubmitDisabled}
                  onPress={handleAnalyzePress}
                  style={({ pressed }) => [
                    styles.analyzeButton,
                    composerState.isSubmitDisabled
                      ? styles.analyzeButtonDisabled
                      : null,
                    pressed && !composerState.isSubmitDisabled
                      ? styles.pressed
                      : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.analyzeButtonText,
                      composerState.isSubmitDisabled
                        ? styles.analyzeButtonTextDisabled
                        : null,
                    ]}
                  >
                    분석
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View style={styles.tabbar} accessibilityRole="tablist">
            {mobileTabs.map((tab) => {
              const selected = tab.key === activeTab;

              return (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{
                    disabled: tab.disabled,
                    selected,
                  }}
                  disabled={tab.disabled}
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  style={({ pressed }) => [
                    styles.tabItem,
                    selected ? styles.tabItemActive : null,
                    tab.disabled ? styles.tabItemDisabled : null,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      selected ? styles.tabTextActive : null,
                      tab.disabled ? styles.tabTextDisabled : null,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function VocabularyPage() {
  return (
    <View style={styles.pageStack}>
      <View style={styles.pageHeader}>
        <View style={styles.pageTitleGroup}>
          <Text style={styles.eyebrow}>Vocabulary</Text>
          <Text style={styles.pageTitle}>단어장</Text>
        </View>
      </View>

      <View style={styles.noticePanel} accessibilityLabel="로그인 안내">
        <Text style={styles.noticeTitle}>
          로그인하면 실제 단어장을 불러와요
        </Text>
        <Text style={styles.noticeText}>
          로그인 전에는 목업 데이터로 흐름을 먼저 확인할 수 있어요.
        </Text>
      </View>

      <View style={styles.pageLayout}>
        <View style={styles.summaryItem} accessibilityLabel="단어장 요약">
          <Text style={styles.summaryLabel}>
            {mobileVocabularySummary.label}
          </Text>
          <Text style={styles.summaryValue}>
            {mobileVocabularySummary.value}
          </Text>
        </View>

        <View style={styles.vocabularyListWrap}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleGroup}>
              <Text style={styles.eyebrow}>Mock flow</Text>
              <Text style={styles.sectionTitle}>저장된 단어처럼 확인해요</Text>
            </View>
            <Text style={styles.sectionMeta}>
              삭제 버튼으로 상태 변화를 확인해요
            </Text>
          </View>

          {mobileVocabularyItems.map((item) => (
            <View key={item.id} style={styles.vocabularyItem}>
              <View style={styles.cardHeader}>
                <View style={styles.termGroup}>
                  <Text style={styles.termText}>{item.term}</Text>
                  <Text style={styles.vocabularyType}>{item.typeLabel}</Text>
                </View>
              </View>
              <View style={styles.meaningList}>
                {item.meanings.map((meaning) => (
                  <View key={meaning.meaning} style={styles.meaningCard}>
                    <Text style={styles.meaningText}>{meaning.meaning}</Text>
                    <Text style={styles.meaningNote}>{meaning.note}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.itemFooter}>
                <Text style={styles.itemMeta}>{item.date}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: true }}
                  disabled
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>삭제</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function ReviewPage() {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const currentCard =
    mobileReviewCards[currentCardIndex] ?? mobileReviewFlashcard;

  const handleNextReviewCard = () => {
    setCurrentCardIndex((index) => (index + 1) % mobileReviewCards.length);
    setIsAnswerRevealed(false);
  };

  return (
    <View style={styles.pageStack}>
      <View style={styles.pageHeader}>
        <View style={styles.pageTitleGroup}>
          <Text style={styles.eyebrow}>Review</Text>
          <Text style={styles.pageTitle}>복습</Text>
        </View>
      </View>

      <View style={styles.noticePanel} accessibilityLabel="로그인 안내">
        <Text style={styles.noticeTitle}>
          로그인하면 내 단어장으로 복습해요
        </Text>
        <Text style={styles.noticeText}>
          로그인 전에는 목업 데이터로 정답을 열고 다음 카드로 넘어가는 흐름을
          먼저 볼 수 있어요.
        </Text>
      </View>

      <View style={styles.pageLayout}>
        <View style={styles.reviewControls} accessibilityLabel="복습 방향">
          {mobileReviewDirections.map((direction, index) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                disabled: true,
                selected: index === 0,
              }}
              disabled
              key={direction}
              style={[
                styles.reviewDirection,
                index === 0 ? styles.reviewDirectionActive : null,
              ]}
            >
              <Text
                style={[
                  styles.reviewDirectionText,
                  index === 0 ? styles.reviewDirectionTextActive : null,
                ]}
              >
                {direction}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.reviewCard}>
          <Text style={styles.eyebrow}>{currentCard.eyebrow}</Text>
          <Text style={styles.reviewMeta}>{currentCard.meta}</Text>
          <Text style={styles.reviewTerm}>{currentCard.term}</Text>
          <Text
            style={[
              styles.reviewAnswer,
              isAnswerRevealed ? styles.reviewAnswerRevealed : null,
            ]}
          >
            {currentCard.answer}
          </Text>
          <Text style={styles.reviewNote}>{currentCard.note}</Text>
        </View>

        <View style={styles.reviewActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isAnswerRevealed }}
            onPress={() => setIsAnswerRevealed((isRevealed) => !isRevealed)}
            style={[styles.secondaryButton, styles.reviewActionButton]}
          >
            <Text style={styles.secondaryButtonText}>
              {isAnswerRevealed ? "정답 가리기" : "정답 보기"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={handleNextReviewCard}
            style={[styles.primaryButton, styles.reviewActionButton]}
          >
            <Text style={styles.primaryButtonText}>다음</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  analyzeButton: {
    alignItems: "center",
    backgroundColor: mobileColors.primary,
    borderRadius: 8,
    minHeight: 42,
    minWidth: 74,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  analyzeButtonDisabled: {
    backgroundColor: mobileColors.sidebarActive,
  },
  analyzeButtonText: {
    color: mobileColors.primaryInk,
    fontSize: 15,
    fontWeight: "800",
  },
  analyzeButtonTextDisabled: {
    color: mobileColors.inkMuted,
  },
  bottomArea: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderTopColor: mobileColors.border,
    borderTopWidth: 1,
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  brandGroup: {
    height: 38,
    justifyContent: "center",
  },
  cardHeader: {
    alignItems: "stretch",
    gap: 6,
  },
  composer: {
    backgroundColor: mobileColors.surface,
    borderColor: mobileColors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 14,
    shadowColor: mobileColors.ink,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  composerFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  content: {
    alignItems: "stretch",
    gap: 20,
    paddingHorizontal: 14,
    paddingTop: 20,
    paddingBottom: 24,
    width: "100%",
  },
  count: {
    color: mobileColors.inkMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  emptyText: {
    color: mobileColors.inkMuted,
    fontSize: 15,
    lineHeight: 23,
  },
  eyebrow: {
    color: mobileColors.inkMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 16,
    textTransform: "uppercase",
  },
  helperText: {
    color: mobileColors.inkMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  input: {
    color: mobileColors.ink,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 74,
    padding: 0,
  },
  itemFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginTop: "auto",
  },
  itemMeta: {
    color: mobileColors.inkMuted,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  loginButton: {
    alignItems: "center",
    backgroundColor: mobileColors.surfaceMuted,
    borderColor: mobileColors.border,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  loginButtonDisabled: {
    opacity: 0.64,
  },
  loginButtonText: {
    color: mobileColors.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  logo: {
    color: mobileColors.ink,
    fontSize: 15,
    fontWeight: "800",
  },
  meaningCard: {
    backgroundColor: mobileColors.surfaceMuted,
    borderColor: "#eeeeea",
    borderRadius: 7,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  meaningNote: {
    color: mobileColors.inkMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  meaningText: {
    color: mobileColors.ink,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
  },
  meaningList: {
    gap: 8,
  },
  noticePanel: {
    backgroundColor: mobileColors.surfaceMuted,
    borderColor: mobileColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  noticeText: {
    color: mobileColors.inkMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  noticeTitle: {
    color: mobileColors.ink,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
  },
  pageLayout: {
    alignSelf: "stretch",
    gap: 14,
    width: "100%",
  },
  pageHeader: {
    alignItems: "stretch",
    gap: 16,
  },
  pageStack: {
    alignSelf: "stretch",
    gap: 18,
    width: "100%",
  },
  pageTitleGroup: {
    gap: 6,
  },
  pageTitle: {
    color: mobileColors.ink,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
  },
  pressed: {
    opacity: 0.72,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: mobileColors.primary,
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: mobileColors.primaryInk,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  reviewCard: {
    alignItems: "center",
    backgroundColor: mobileColors.surface,
    borderColor: mobileColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    justifyContent: "center",
    minHeight: 220,
    padding: 28,
  },
  reviewActionButton: {
    flex: 1,
    minWidth: 0,
  },
  reviewActions: {
    alignSelf: "stretch",
    flexDirection: "row",
    gap: 8,
    minWidth: 0,
    width: "100%",
  },
  reviewAnswer: {
    color: mobileColors.ink,
    filter: "blur(5px)",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 22,
  },
  reviewAnswerRevealed: {
    filter: "none",
  },
  reviewControls: {
    alignSelf: "stretch",
    flexDirection: "row",
    gap: 8,
    minWidth: 0,
    width: "100%",
  },
  reviewDirection: {
    alignItems: "center",
    backgroundColor: mobileColors.surface,
    borderColor: mobileColors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 36,
    minWidth: 0,
    paddingHorizontal: 12,
  },
  reviewDirectionActive: {
    backgroundColor: mobileColors.sidebarActive,
  },
  reviewDirectionText: {
    color: mobileColors.inkMuted,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 36,
  },
  reviewDirectionTextActive: {
    color: mobileColors.ink,
  },
  reviewTerm: {
    color: mobileColors.ink,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 36,
  },
  reviewMeta: {
    color: mobileColors.inkMuted,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  reviewNote: {
    color: mobileColors.inkMuted,
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 420,
    textAlign: "center",
  },
  resultArea: {
    backgroundColor: mobileColors.surface,
    borderColor: mobileColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    minHeight: 280,
    padding: 18,
  },
  resultTitle: {
    color: mobileColors.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  safeArea: {
    backgroundColor: mobileColors.surface,
    flex: 1,
  },
  shell: {
    backgroundColor: mobileColors.surface,
    flex: 1,
  },
  sectionHeader: {
    alignItems: "stretch",
    gap: 8,
  },
  sectionMeta: {
    color: mobileColors.inkMuted,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
  sectionTitle: {
    color: mobileColors.ink,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 21,
  },
  sectionTitleGroup: {
    gap: 5,
  },
  summaryItem: {
    alignItems: "center",
    backgroundColor: mobileColors.surface,
    borderColor: mobileColors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    minHeight: 62,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  summaryLabel: {
    color: mobileColors.inkMuted,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  summaryValue: {
    color: mobileColors.ink,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 20,
  },
  tabbar: {
    alignItems: "center",
    backgroundColor: mobileColors.surface,
    borderColor: mobileColors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    marginBottom: 8,
    minHeight: 54,
    padding: 4,
  },
  tabItem: {
    alignItems: "center",
    borderRadius: 6,
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
  },
  tabItemActive: {
    backgroundColor: mobileColors.sidebar,
  },
  tabItemDisabled: {
    opacity: 0.54,
  },
  tabText: {
    color: mobileColors.inkMuted,
    fontSize: 13,
    fontWeight: "800",
  },
  tabTextActive: {
    color: mobileColors.primary,
  },
  tabTextDisabled: {
    color: mobileColors.inkMuted,
  },
  termGroup: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  termText: {
    color: mobileColors.ink,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
  },
  topbar: {
    alignItems: "center",
    backgroundColor: mobileColors.surface,
    borderBottomColor: mobileColors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  vocabularyItem: {
    backgroundColor: mobileColors.surface,
    borderColor: mobileColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    minHeight: 220,
    padding: 18,
    shadowColor: mobileColors.ink,
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
  },
  vocabularyListWrap: {
    gap: 10,
  },
  vocabularyType: {
    alignSelf: "flex-start",
    backgroundColor: mobileColors.surfaceMuted,
    borderColor: mobileColors.border,
    borderRadius: 999,
    borderWidth: 1,
    color: mobileColors.inkMuted,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: mobileColors.surfaceMuted,
    borderColor: mobileColors.border,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 32,
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    color: mobileColors.ink,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 32,
    textAlign: "center",
  },
});
