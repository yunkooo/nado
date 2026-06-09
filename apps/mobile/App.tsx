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
  mobileReviewDirections,
  mobileReviewFlashcard,
  mobileTabs,
  mobileVocabularyItems,
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
        <Text style={styles.noticeTitle}>Google 로그인이 필요해요</Text>
        <Text style={styles.noticeText}>
          로그인하면 저장한 단어와 표현을 이 화면에서 볼 수 있어요.
        </Text>
      </View>

      <View style={styles.pageLayout}>
        <View style={styles.emptyPanel}>
          <Text style={styles.eyebrow}>비어 있음</Text>
          <Text style={styles.emptyPanelTitle}>단어장 항목이 아직 없어요</Text>
          <Text style={styles.panelText}>저장된 단어와 표현이 없습니다.</Text>
        </View>

        {mobileVocabularyItems.map((item) => (
          <View key={item.id} style={styles.vocabularyItem}>
            <View style={styles.cardHeader}>
              <View style={styles.termGroup}>
                <Text style={styles.termText}>{item.term}</Text>
                <Text style={styles.itemMeta}>{item.typeLabel}</Text>
              </View>
              <Text style={styles.itemMeta}>{item.date}</Text>
            </View>
            <View style={styles.meaningList}>
              {item.meanings.map((meaning) => (
                <View key={meaning} style={styles.meaningRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.meaningText}>{meaning}</Text>
                </View>
              ))}
            </View>
            <View style={styles.itemActionRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: true }}
                disabled
                style={[styles.secondaryButton, styles.disabledControl]}
              >
                <Text style={styles.secondaryButtonText}>삭제</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function ReviewPage() {
  return (
    <View style={styles.pageStack}>
      <View style={styles.pageHeader}>
        <View style={styles.pageTitleGroup}>
          <Text style={styles.eyebrow}>Review</Text>
          <Text style={styles.pageTitle}>복습</Text>
        </View>
      </View>

      <View style={styles.noticePanel} accessibilityLabel="로그인 안내">
        <Text style={styles.noticeTitle}>Google 로그인이 필요해요</Text>
        <Text style={styles.noticeText}>
          로그인하면 저장한 단어로 복습을 시작할 수 있어요.
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
          <Text style={styles.eyebrow}>{mobileReviewFlashcard.eyebrow}</Text>
          <Text style={styles.reviewTerm}>{mobileReviewFlashcard.term}</Text>
          <Text style={styles.reviewAnswer}>
            {mobileReviewFlashcard.answer}
          </Text>
        </View>

        <View style={styles.reviewActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            disabled
            style={[
              styles.secondaryButton,
              styles.reviewActionButton,
              styles.disabledControl,
            ]}
          >
            <Text style={styles.secondaryButtonText}>끝내기</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            disabled
            style={[
              styles.primaryButton,
              styles.reviewActionButton,
              styles.disabledControl,
            ]}
          >
            <Text style={styles.primaryButtonText}>다음</Text>
          </Pressable>
        </View>

        <View style={styles.emptyPanel}>
          <Text style={styles.eyebrow}>비어 있음</Text>
          <Text style={styles.emptyPanelTitle}>복습할 단어가 없어요</Text>
          <Text style={styles.panelText}>저장된 단어와 표현이 없습니다.</Text>
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
    backgroundColor: mobileColors.canvas,
    borderTopColor: mobileColors.border,
    borderTopWidth: 1,
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  brandGroup: {
    gap: 2,
  },
  bullet: {
    color: mobileColors.inkMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  cardHeader: {
    alignItems: "stretch",
    gap: 4,
    justifyContent: "space-between",
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
    padding: 20,
    paddingBottom: 28,
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
  emptyPanel: {
    backgroundColor: mobileColors.surface,
    borderColor: mobileColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 24,
  },
  emptyPanelTitle: {
    color: mobileColors.ink,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
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
  disabledControl: {
    opacity: 0.55,
  },
  itemActionRow: {
    alignItems: "flex-end",
  },
  itemMeta: {
    color: mobileColors.inkMuted,
    fontSize: 12,
    fontWeight: "700",
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
    color: mobileColors.primary,
    fontSize: 18,
    fontWeight: "900",
  },
  meaningText: {
    color: mobileColors.inkMuted,
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
  },
  meaningList: {
    gap: 6,
  },
  meaningRow: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 8,
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
    fontWeight: "900",
    lineHeight: 30,
  },
  panelText: {
    color: mobileColors.inkMuted,
    fontSize: 14,
    lineHeight: 22,
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
    color: mobileColors.inkMuted,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 22,
    opacity: 0.28,
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
    fontWeight: "900",
    lineHeight: 36,
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
    backgroundColor: mobileColors.canvas,
    flex: 1,
  },
  shell: {
    flex: 1,
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
    backgroundColor: mobileColors.canvas,
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
    gap: 12,
    padding: 16,
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
