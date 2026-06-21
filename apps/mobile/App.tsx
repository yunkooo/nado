import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Pressable,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  MAX_ANALYSIS_TEXT_LENGTH,
  getDistinctVocabularyNote,
} from "@nado/shared";
import {
  ANALYSIS_INPUT_ACCESSIBILITY_LABEL,
  INITIAL_ANALYSIS_TEXT,
  getAnalysisComposerState,
  getAnalysisSourceSampleState,
  mobileTabs,
} from "./src/features/analysis/analysisScreen";
import { signInWithGoogle, signOut } from "./src/auth/authClient";
import { useMobileAuthState } from "./src/auth/authState";
import { analyzeText } from "./src/api/analysisApi";
import { readMobileApiBaseUrl } from "./src/api/apiConfig";
import {
  getNextReviewIndex,
  getReviewCard,
  mobileReviewDirectionOptions,
  type ReviewDirection,
} from "./src/features/review/reviewHelpers";
import type { MobileTabKey } from "./src/features/analysis/analysisScreen";
import type { AnalyzeTextResult } from "./src/api/analysisApi";
import { mobileColors, styles } from "./src/styles/mobileStyles";
import {
  getMobileStatePanelCopy,
  getMobileVocabularyPanelState,
  type MobilePanelState,
  type MobilePanelType,
} from "./src/components/mobilePanelState";
import {
  useMobileVocabulary,
  type MobileVocabularyActions,
  type MobileVocabularyState,
} from "./src/features/vocabulary/useMobileVocabulary";

type AnalysisState = AnalyzeTextResult | { status: "idle" | "loading" };

const configuredMobileApiBaseUrl = readMobileApiBaseUrl();
const configuredMobileApiPlatform = Platform.OS;

export default function App() {
  const [text, setText] = useState(INITIAL_ANALYSIS_TEXT);
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    status: "idle",
  });
  const [activeTab, setActiveTab] = useState<MobileTabKey>("analysis");
  const [authActionMessage, setAuthActionMessage] = useState<string | null>(
    null,
  );
  const authState = useMobileAuthState();
  const isStudyTabActive = activeTab === "vocabulary" || activeTab === "review";
  const [vocabularyState, vocabularyActions] = useMobileVocabulary(
    authState,
    isStudyTabActive,
    activeTab,
  );
  const composerState = getAnalysisComposerState(text);
  const isAnalysisLoading = analysisState.status === "loading";
  const isAnalyzeDisabled = composerState.isSubmitDisabled || isAnalysisLoading;
  const studyRefreshControl = isStudyTabActive ? (
    <RefreshControl
      colors={[mobileColors.primary]}
      onRefresh={vocabularyActions.refreshVocabulary}
      refreshing={vocabularyActions.isRefreshing}
      tintColor={mobileColors.inkMuted}
    />
  ) : undefined;

  useEffect(() => {
    if (!vocabularyActions.saveMessage) {
      return;
    }

    const timeoutId = setTimeout(() => {
      vocabularyActions.clearSaveMessage();
    }, 2400);

    return () => clearTimeout(timeoutId);
  }, [vocabularyActions.saveMessage]);

  const handleAuthPress = async () => {
    if (authState.status === "authenticated") {
      const result = await signOut();
      setAuthActionMessage(result.status === "error" ? result.message : null);
      return;
    }

    const result = await signInWithGoogle();
    setAuthActionMessage(result.status === "error" ? result.message : null);
  };

  const handleTextChange = (nextText: string) => {
    setText(nextText);

    if (!isAnalysisLoading) {
      setAnalysisState({ status: "idle" });
    }
  };

  const handleAnalyzePress = async () => {
    const trimmedText = text.trim();

    if (trimmedText.length === 0 || isAnalysisLoading) {
      return;
    }

    setAnalysisState({ status: "loading" });

    const nextAnalysisState = await analyzeText(trimmedText, {
      accessToken: authState.accessToken,
      apiBaseUrl: configuredMobileApiBaseUrl,
      apiPlatform: configuredMobileApiPlatform,
    });

    setAnalysisState(nextAnalysisState);

    if (nextAnalysisState.status === "success") {
      setText("");
    }
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
            accessibilityState={{ disabled: authState.status === "loading" }}
            disabled={authState.status === "loading"}
            onPress={handleAuthPress}
            style={({ pressed }) => [
              styles.loginButton,
              authState.status === "loading"
                ? styles.loginButtonDisabled
                : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.loginButtonText}>
              {authState.status === "authenticated"
                ? "로그아웃"
                : authState.status === "loading"
                  ? "확인 중"
                  : "Google 로그인"}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={studyRefreshControl}
        >
          {authActionMessage ? (
            <StatusCard
              message={authActionMessage}
              title="로그인 안내"
              tone="error"
            />
          ) : null}
          {activeTab === "analysis" ? (
            <AnalysisResultPanel
              analysisState={analysisState}
              getSuggestionState={vocabularyActions.getSuggestionState}
              onSaveSuggestion={vocabularyActions.saveSuggestion}
            />
          ) : null}
          {activeTab === "vocabulary" ? (
            <VocabularyPage
              authStatus={authState.status}
              deletingItemId={vocabularyActions.deletingItemId}
              onDeleteItem={vocabularyActions.deleteItem}
              vocabularyState={vocabularyState}
            />
          ) : null}
          {activeTab === "review" ? (
            <ReviewPage
              authStatus={authState.status}
              vocabularyState={vocabularyState}
            />
          ) : null}
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
                onChangeText={handleTextChange}
                placeholder={composerState.placeholderText}
                placeholderTextColor={mobileColors.inkMuted}
                style={[styles.input, styles.inputFocusReset]}
                textAlignVertical="top"
                value={text}
              />
              <View style={styles.composerFooter}>
                <Text style={styles.count}>{composerState.countLabel}</Text>
                <Pressable
                  accessibilityRole="button"
                  disabled={isAnalyzeDisabled}
                  onPress={handleAnalyzePress}
                  style={({ pressed }) => [
                    styles.analyzeButton,
                    isAnalyzeDisabled ? styles.analyzeButtonDisabled : null,
                    pressed && !isAnalyzeDisabled ? styles.pressed : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.analyzeButtonText,
                      isAnalyzeDisabled
                        ? styles.analyzeButtonTextDisabled
                        : null,
                    ]}
                  >
                    {isAnalysisLoading ? "분석 중" : "분석"}
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

        {vocabularyActions.saveMessage ? (
          <View pointerEvents="none" style={styles.toastOverlay}>
            <View accessibilityRole="alert" style={styles.toast}>
              <Text style={styles.toastText}>
                {vocabularyActions.saveMessage}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function AnalysisResultPanel({
  analysisState,
  getSuggestionState,
  onSaveSuggestion,
}: {
  analysisState: AnalysisState;
  getSuggestionState: MobileVocabularyActions["getSuggestionState"];
  onSaveSuggestion: MobileVocabularyActions["saveSuggestion"];
}) {
  if (analysisState.status === "idle") {
    return null;
  }

  if (analysisState.status === "loading") {
    return (
      <StatusCard
        message="입력한 문장을 분석 서버로 전송하고 있어요."
        title="분석 중이에요"
      />
    );
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

  return (
    <View style={styles.resultArea}>
      <View style={styles.resultHeader}>
        <View style={styles.resultTitleGroup}>
          <Text style={styles.resultTitle}>분석 결과</Text>
          <Text style={styles.resultDescription}>
            자연스러운 번역, 문장별 끊어읽기 직역, 문법 포인트, 단어 추천을 한
            번에 제공합니다.
          </Text>
        </View>
        <Text style={styles.resultMeta}>200자 이내 기본 분석</Text>
      </View>

      <View accessibilityLabel="입력한 문장" style={styles.sourceSample}>
        <Text style={styles.sourceSampleText}>{sourceSample.text}</Text>
        <Text style={styles.sourceSampleCount}>{sourceSample.countLabel}</Text>
      </View>

      <ResultSection title="전체 자연스러운 번역">
        <Text style={styles.resultTranslation}>{result.translation}</Text>
      </ResultSection>

      <ResultSection title="번역 포인트">
        <View style={styles.translationNoteList}>
          {result.translationNotes.map((note) => (
            <View key={`${note.term}-${note.note}`} style={styles.noteItem}>
              <Text style={styles.noteTerm}>{note.term}</Text>
              <Text style={styles.noteText}>{note.note}</Text>
            </View>
          ))}
        </View>
      </ResultSection>

      <ResultSection title="문장별 분석">
        <View style={styles.sentenceList}>
          {result.sentences.map((sentence) => (
            <View
              key={`${sentence.indexLabel}-${sentence.naturalTranslation}`}
              style={styles.sentenceCard}
            >
              <Text style={styles.sentenceIndex}>{sentence.indexLabel}</Text>
              <View style={styles.chunkLine}>
                {sentence.chunks.map((chunk, index) => (
                  <View
                    key={`${chunk.english}-${chunk.korean}-${index}`}
                    style={styles.chunkUnit}
                  >
                    <View style={styles.chunkContent}>
                      <Text style={styles.chunkEnglish}>{chunk.english}</Text>
                      <Text style={styles.chunkKorean}>{chunk.korean}</Text>
                    </View>
                  </View>
                ))}
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
                      <Text style={styles.grammarType}>{point.type}</Text>
                      <Text style={styles.grammarExplanation}>
                        {point.explanation}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
        </View>
      </ResultSection>

      <ResultSection title="우선 저장 추천">
        <View style={styles.suggestionList}>
          {result.vocabularySuggestions.map((suggestion) => {
            const suggestionState = getSuggestionState(suggestion);
            const isSavingDisabled = suggestionState !== "idle";

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: isSavingDisabled }}
                disabled={isSavingDisabled}
                key={`${suggestion.term}-${suggestion.meaning}`}
                onPress={() => {
                  void onSaveSuggestion(suggestion);
                }}
                style={({ pressed }) => [
                  styles.suggestionChip,
                  suggestionState === "saved"
                    ? styles.suggestionChipSaved
                    : null,
                  suggestionState === "saving"
                    ? styles.suggestionChipSaving
                    : null,
                  pressed && !isSavingDisabled ? styles.pressed : null,
                ]}
              >
                <Text style={styles.suggestionPrefix}>
                  {readSuggestionSavePrefix(suggestionState)}
                </Text>
                <Text style={styles.suggestionText}>
                  {suggestion.term} · {suggestion.meaning}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ResultSection>
    </View>
  );
}

function readSuggestionSavePrefix(state: "idle" | "saved" | "saving") {
  if (state === "saving") {
    return "저장 중";
  }

  if (state === "saved") {
    return "저장됨";
  }

  return "+";
}

function ResultSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <View style={styles.resultSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function StatusCard({
  message,
  title,
  tone = "neutral",
}: {
  message: string;
  title: string;
  tone?: "error" | "neutral";
}) {
  return (
    <View
      accessibilityRole={tone === "error" ? "alert" : undefined}
      style={styles.statusCard}
    >
      <Text style={styles.statusTitle}>{title}</Text>
      <Text style={styles.statusText}>{message}</Text>
    </View>
  );
}

function VocabularyPage({
  authStatus,
  deletingItemId,
  onDeleteItem,
  vocabularyState,
}: {
  authStatus: MobileAuthState["status"];
  deletingItemId: string | null;
  onDeleteItem: (itemId: string) => void;
  vocabularyState: MobileVocabularyState;
}) {
  const panelState = getMobileVocabularyPanelState(authStatus, vocabularyState);

  return (
    <View style={styles.pageStack}>
      <View style={styles.pageHeader}>
        <View style={styles.pageTitleGroup}>
          <Text style={styles.eyebrow}>My vocabulary</Text>
          <Text style={styles.pageTitle}>저장한 단어를 확인해요</Text>
        </View>
        <Text style={styles.pageDescription}>
          분석에서 저장한 단어와 표현을 한곳에 모아둡니다.
        </Text>
      </View>

      <View style={styles.pageLayout}>
        <View style={styles.summaryItem} accessibilityLabel="단어장 요약">
          <Text style={styles.summaryLabel}>저장 항목</Text>
          <Text style={styles.summaryValue}>
            {panelState === "list" ? String(vocabularyState.items.length) : "-"}
          </Text>
        </View>

        <View style={styles.vocabularyListWrap}>
          {panelState === "list" ? (
            <>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleGroup}>
                  <Text style={styles.eyebrow}>Saved items</Text>
                  <Text style={styles.sectionTitle}>
                    분석에서 저장한 항목이에요
                  </Text>
                </View>
              </View>

              {vocabularyState.items.map((item) => (
                <View key={item.id} style={styles.vocabularyItem}>
                  <View style={styles.cardHeader}>
                    <View style={styles.termGroup}>
                      <Text style={styles.termText}>{item.term}</Text>
                      <Text style={styles.vocabularyType}>{item.type}</Text>
                    </View>
                  </View>
                  <View style={styles.meaningList}>
                    {item.meanings.map((meaning) => {
                      const meaningDisplayNote = getDistinctVocabularyNote(
                        meaning.note,
                        [meaning.meaning],
                      );

                      return (
                        <View key={meaning.meaning} style={styles.meaningCard}>
                          <Text style={styles.meaningText}>
                            {meaning.meaning}
                          </Text>
                          {meaningDisplayNote ? (
                            <Text style={styles.meaningNote}>
                              {meaningDisplayNote}
                            </Text>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                  <View style={styles.itemFooter}>
                    <Text style={styles.itemMeta}>
                      {formatVocabularyDate(item.updatedAt)}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{
                        disabled: deletingItemId === item.id,
                      }}
                      disabled={deletingItemId === item.id}
                      onPress={() => onDeleteItem(item.id)}
                      style={styles.secondaryButton}
                    >
                      <Text style={styles.secondaryButtonText}>
                        {deletingItemId === item.id ? "삭제 중" : "삭제"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </>
          ) : (
            <MobileStatePanel
              message={vocabularyState.message}
              state={panelState}
              type="vocabulary"
            />
          )}
        </View>
      </View>
    </View>
  );
}

function ReviewPage({
  authStatus,
  vocabularyState,
}: {
  authStatus: MobileAuthState["status"];
  vocabularyState: MobileVocabularyState;
}) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [direction, setDirection] =
    useState<ReviewDirection>("english-to-korean");
  const panelState = getMobileVocabularyPanelState(authStatus, vocabularyState);
  const currentItem = vocabularyState.items[currentCardIndex] ?? null;
  const currentCard = currentItem
    ? getReviewCard(currentItem, direction)
    : null;

  useEffect(() => {
    setCurrentCardIndex((index) =>
      vocabularyState.items.length === 0
        ? 0
        : Math.min(index, vocabularyState.items.length - 1),
    );
    setIsAnswerRevealed(false);
  }, [vocabularyState.items.length]);

  const handleNextReviewCard = () => {
    setCurrentCardIndex((index) =>
      getNextReviewIndex(index, vocabularyState.items.length),
    );
    setIsAnswerRevealed(false);
  };

  return (
    <View style={styles.pageStack}>
      <View style={styles.pageHeader}>
        <View style={styles.pageTitleGroup}>
          <Text style={styles.pageTitle}>복습</Text>
        </View>
      </View>

      <View style={styles.pageLayout}>
        {panelState === "list" && currentCard ? (
          <>
            <View style={styles.reviewControls} accessibilityLabel="복습 방향">
              {mobileReviewDirectionOptions.map((option) => {
                const selected = option.key === direction;

                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={option.key}
                    onPress={() => {
                      setDirection(option.key);
                      setIsAnswerRevealed(false);
                    }}
                    style={[
                      styles.reviewDirection,
                      selected ? styles.reviewDirectionActive : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.reviewDirectionText,
                        selected ? styles.reviewDirectionTextActive : null,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.reviewCard}>
              <Text style={styles.reviewMeta}>
                {currentCardIndex + 1} / {vocabularyState.items.length}
              </Text>
              <Text style={styles.eyebrow}>My flashcard</Text>
              <Text style={styles.reviewTerm}>{currentCard.prompt}</Text>
              {isAnswerRevealed ? (
                <Text style={styles.reviewAnswer}>{currentCard.answer}</Text>
              ) : (
                <View
                  accessibilityLabel="정답이 가려져 있습니다"
                  style={styles.reviewAnswerBlur}
                >
                  <View style={styles.reviewAnswerBlurLineWide} />
                  <View style={styles.reviewAnswerBlurLineNarrow} />
                </View>
              )}
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
          </>
        ) : (
          <MobileStatePanel
            message={vocabularyState.message}
            state={panelState === "list" ? "empty" : panelState}
            type="review"
          />
        )}
      </View>
    </View>
  );
}

type MobileAuthState = ReturnType<typeof useMobileAuthState>;

function MobileStatePanel({
  message,
  state,
  type,
}: {
  message: string | null;
  state: Exclude<MobilePanelState, "list">;
  type: MobilePanelType;
}) {
  const copy = getMobileStatePanelCopy(type, state, message);

  return (
    <View
      accessibilityRole={state === "error" ? "alert" : undefined}
      style={styles.emptyPanel}
    >
      <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
      <Text style={styles.emptyPanelTitle}>{copy.title}</Text>
      <Text style={styles.emptyPanelText}>{copy.message}</Text>
    </View>
  );
}

function formatVocabularyDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}.${month}.${day}`;
}
