import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Pressable,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MAX_ANALYSIS_TEXT_LENGTH } from "@nado/shared";
import type { VocabularyItem } from "@nado/shared";
import {
  ANALYSIS_INPUT_ACCESSIBILITY_LABEL,
  INITIAL_ANALYSIS_TEXT,
  getAnalysisComposerState,
  mobileTabs,
} from "./src/analysisScreen";
import { signInWithGoogle, signOut } from "./src/authClient";
import { useMobileAuthState } from "./src/authState";
import { analyzeText } from "./src/analysisApi";
import { readMobileApiBaseUrl } from "./src/apiConfig";
import {
  getNextReviewIndex,
  getReviewCard,
  mobileReviewDirectionOptions,
  type ReviewDirection,
} from "./src/reviewHelpers";
import { deleteVocabularyItem, listVocabulary } from "./src/vocabularyApi";
import type { MobileTabKey } from "./src/analysisScreen";
import type { AnalyzeTextResult } from "./src/analysisApi";

type AnalysisState = AnalyzeTextResult | { status: "idle" | "loading" };

type MobileVocabularyState = {
  items: VocabularyItem[];
  message: string | null;
  status: "idle" | "loading" | "ready" | "error";
};

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

const configuredMobileApiBaseUrl = readMobileApiBaseUrl();
const configuredMobileApiPlatform = Platform.OS;

const initialVocabularyState: MobileVocabularyState = {
  items: [],
  message: null,
  status: "idle",
};

export default function App() {
  const [text, setText] = useState(INITIAL_ANALYSIS_TEXT);
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    status: "idle",
  });
  const [activeTab, setActiveTab] = useState<MobileTabKey>("analysis");
  const [deletingVocabularyItemId, setDeletingVocabularyItemId] = useState<
    string | null
  >(null);
  const [vocabularyState, setVocabularyState] = useState<MobileVocabularyState>(
    initialVocabularyState,
  );
  const authState = useMobileAuthState();
  const composerState = getAnalysisComposerState(text);
  const isAnalysisLoading = analysisState.status === "loading";
  const isAnalyzeDisabled = composerState.isSubmitDisabled || isAnalysisLoading;

  useEffect(() => {
    let isCurrent = true;

    async function loadVocabulary(accessToken: string) {
      setVocabularyState((currentState) => ({
        items: currentState.items,
        message: null,
        status: "loading",
      }));

      const result = await listVocabulary(accessToken, {
        apiBaseUrl: configuredMobileApiBaseUrl,
        apiPlatform: configuredMobileApiPlatform,
      });

      if (!isCurrent) {
        return;
      }

      if (result.status === "success") {
        setVocabularyState({
          items: result.data,
          message: null,
          status: "ready",
        });
        return;
      }

      setVocabularyState({
        items: [],
        message: result.message,
        status: "error",
      });
    }

    if (authState.status === "loading") {
      return () => {
        isCurrent = false;
      };
    }

    if (authState.status !== "authenticated" || !authState.accessToken) {
      setVocabularyState(initialVocabularyState);
      return () => {
        isCurrent = false;
      };
    }

    void loadVocabulary(authState.accessToken);

    return () => {
      isCurrent = false;
    };
  }, [authState.accessToken, authState.status]);

  const handleAuthPress = async () => {
    if (authState.status === "authenticated") {
      await signOut();
      return;
    }

    await signInWithGoogle();
  };

  const handleDeleteVocabularyItem = async (itemId: string) => {
    if (authState.status !== "authenticated" || !authState.accessToken) {
      return;
    }

    setDeletingVocabularyItemId(itemId);
    const result = await deleteVocabularyItem(itemId, authState.accessToken, {
      apiBaseUrl: configuredMobileApiBaseUrl,
      apiPlatform: configuredMobileApiPlatform,
    });
    setDeletingVocabularyItemId(null);

    if (result.status !== "success") {
      setVocabularyState((currentState) => ({
        ...currentState,
        message: result.message,
        status: "error",
      }));
      return;
    }

    setVocabularyState((currentState) => ({
      ...currentState,
      items: currentState.items.filter((item) => item.id !== itemId),
      status: "ready",
    }));
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
        >
          {activeTab === "analysis" ? (
            <AnalysisResultPanel analysisState={analysisState} />
          ) : null}
          {activeTab === "vocabulary" ? (
            <VocabularyPage
              authStatus={authState.status}
              deletingItemId={deletingVocabularyItemId}
              onDeleteItem={handleDeleteVocabularyItem}
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
      </View>
    </SafeAreaView>
  );
}

function AnalysisResultPanel({
  analysisState,
}: {
  analysisState: AnalysisState;
}) {
  if (analysisState.status === "idle") {
    return null;
  }

  if (analysisState.status === "loading") {
    return (
      <View style={styles.resultArea}>
        <Text style={styles.resultTitle}>분석 중이에요.</Text>
        <Text style={styles.emptyText}>
          입력한 문장을 분석 서버로 전송하고 있어요.
        </Text>
      </View>
    );
  }

  if (
    analysisState.status === "error" ||
    analysisState.status === "not_analyzable"
  ) {
    return (
      <View style={styles.resultArea}>
        <Text style={styles.resultTitle}>분석 결과</Text>
        <Text style={styles.emptyText}>{analysisState.message}</Text>
      </View>
    );
  }

  if (analysisState.status !== "success") {
    return null;
  }

  const result = analysisState.data;

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
          {result.vocabularySuggestions.map((suggestion) => (
            <View
              key={`${suggestion.term}-${suggestion.meaning}`}
              style={styles.suggestionChip}
            >
              <Text style={styles.suggestionPrefix}>+</Text>
              <Text style={styles.suggestionText}>
                {suggestion.term} · {suggestion.meaning}
              </Text>
            </View>
          ))}
        </View>
      </ResultSection>
    </View>
  );
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
                    {item.meanings.map((meaning) => (
                      <View key={meaning.meaning} style={styles.meaningCard}>
                        <Text style={styles.meaningText}>
                          {meaning.meaning}
                        </Text>
                        {meaning.note ? (
                          <Text style={styles.meaningNote}>{meaning.note}</Text>
                        ) : null}
                      </View>
                    ))}
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
          <Text style={styles.eyebrow}>My flashcard</Text>
          <Text style={styles.pageTitle}>저장한 단어로 복습해요</Text>
        </View>
        <Text style={styles.pageDescription}>
          단어장 항목을 카드로 넘기며 뜻과 표현을 확인합니다.
        </Text>
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
              <Text
                aria-hidden={isAnswerRevealed ? undefined : true}
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

type MobilePanelState =
  | "auth_required"
  | "empty"
  | "error"
  | "list"
  | "loading";

type MobileAuthState = ReturnType<typeof useMobileAuthState>;

function getMobileVocabularyPanelState(
  authStatus: MobileAuthState["status"],
  vocabularyState: MobileVocabularyState,
): MobilePanelState {
  if (authStatus === "loading" || vocabularyState.status === "loading") {
    return "loading";
  }

  if (authStatus !== "authenticated") {
    return "auth_required";
  }

  if (vocabularyState.status === "error") {
    return "error";
  }

  return vocabularyState.items.length > 0 ? "list" : "empty";
}

function MobileStatePanel({
  message,
  state,
  type,
}: {
  message: string | null;
  state: Exclude<MobilePanelState, "list">;
  type: "review" | "vocabulary";
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

function getMobileStatePanelCopy(
  type: "review" | "vocabulary",
  state: Exclude<MobilePanelState, "list">,
  message: string | null,
) {
  if (state === "error") {
    return {
      eyebrow: "연결 오류",
      message:
        message ??
        (type === "vocabulary"
          ? "단어장을 불러오지 못했어요."
          : "복습 단어를 불러오지 못했어요."),
      title:
        type === "vocabulary"
          ? "단어장을 불러오지 못했어요"
          : "복습 단어를 불러오지 못했어요",
    };
  }

  if (state === "loading") {
    return {
      eyebrow: "확인 중",
      message:
        type === "vocabulary"
          ? "단어장 데이터를 불러오기 전에 계정 상태를 먼저 확인합니다."
          : "복습 카드를 불러오기 전에 계정 상태를 먼저 확인합니다.",
      title: "로그인 세션을 확인하고 있어요",
    };
  }

  if (state === "empty") {
    return {
      eyebrow: "저장 전",
      message:
        type === "vocabulary"
          ? "분석 결과에서 단어와 표현을 저장하면 이곳에 모을게요."
          : "분석 결과에서 단어를 저장하면 바로 복습 카드로 이어집니다.",
      title:
        type === "vocabulary"
          ? "저장된 단어가 아직 없어요"
          : "복습할 단어가 없어요",
    };
  }

  return {
    eyebrow: "로그인 필요",
    message:
      type === "vocabulary"
        ? "Google 로그인 후 저장한 단어와 표현을 이곳에서 확인해 주세요."
        : "Google 로그인 후 단어장에 저장한 항목으로 복습을 이어가 주세요.",
    title:
      type === "vocabulary"
        ? "로그인 후 단어장을 이용할 수 있어요"
        : "로그인 후 복습을 이용할 수 있어요",
  };
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
  chunkContent: {
    backgroundColor: mobileColors.surface,
    borderColor: mobileColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: "100%",
  },
  chunkEnglish: {
    color: mobileColors.ink,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
  },
  chunkUnit: {
    alignItems: "flex-start",
    minWidth: 0,
    width: "100%",
  },
  chunkKorean: {
    color: mobileColors.inkMuted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    width: "100%",
  },
  chunkLine: {
    gap: 8,
    minWidth: 0,
    width: "100%",
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
  emptyPanel: {
    backgroundColor: mobileColors.surface,
    borderColor: mobileColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    minHeight: 210,
    padding: 22,
  },
  emptyPanelText: {
    color: mobileColors.inkMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  emptyPanelTitle: {
    color: mobileColors.ink,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 28,
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
  grammarExplanation: {
    color: mobileColors.inkMuted,
    fontSize: 13,
    lineHeight: 20,
    minWidth: 0,
  },
  grammarItem: {
    alignItems: "flex-start",
    borderTopColor: mobileColors.border,
    borderTopWidth: 1,
    gap: 8,
    paddingTop: 10,
  },
  grammarList: {
    gap: 10,
  },
  grammarTarget: {
    color: mobileColors.ink,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 20,
  },
  grammarType: {
    color: mobileColors.inkMuted,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 20,
  },
  input: {
    color: mobileColors.ink,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 74,
    outlineColor: "transparent",
    outlineWidth: 0,
    padding: 0,
  },
  inputFocusReset: {
    borderColor: "transparent",
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
  noteItem: {
    gap: 4,
  },
  noteTerm: {
    color: mobileColors.primary,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
  },
  noteText: {
    color: mobileColors.ink,
    fontSize: 14,
    lineHeight: 22,
  },
  pageLayout: {
    alignSelf: "stretch",
    gap: 14,
    width: "100%",
  },
  pageHeader: {
    alignItems: "stretch",
    gap: 8,
  },
  pageStack: {
    alignSelf: "stretch",
    gap: 16,
    width: "100%",
  },
  pageDescription: {
    color: mobileColors.inkMuted,
    fontSize: 14,
    lineHeight: 22,
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
    gap: 12,
    justifyContent: "center",
    minHeight: 260,
    paddingHorizontal: 22,
    paddingVertical: 28,
    shadowColor: mobileColors.ink,
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
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
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 28,
    minHeight: 30,
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
    minHeight: 42,
    minWidth: 0,
    paddingHorizontal: 12,
  },
  reviewDirectionActive: {
    backgroundColor: mobileColors.primary,
    borderColor: mobileColors.primary,
  },
  reviewDirectionText: {
    color: mobileColors.inkMuted,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 36,
  },
  reviewDirectionTextActive: {
    color: mobileColors.primaryInk,
  },
  reviewTerm: {
    color: mobileColors.ink,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 38,
    textAlign: "center",
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
    gap: 0,
    padding: 0,
  },
  resultDescription: {
    color: mobileColors.inkMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  resultHeader: {
    alignItems: "flex-start",
    borderBottomColor: mobileColors.border,
    borderBottomWidth: 1,
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  resultTitleGroup: {
    gap: 6,
  },
  resultTitle: {
    color: mobileColors.ink,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
  },
  resultMeta: {
    color: mobileColors.inkMuted,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  resultSection: {
    borderBottomColor: mobileColors.border,
    borderBottomWidth: 1,
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  resultTranslation: {
    color: mobileColors.ink,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 28,
  },
  sentenceCard: {
    backgroundColor: mobileColors.surfaceMuted,
    borderColor: "#eeeeea",
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    minWidth: 0,
    padding: 14,
    width: "100%",
  },
  sentenceIndex: {
    color: mobileColors.inkMuted,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  sentenceList: {
    gap: 12,
    minWidth: 0,
    width: "100%",
  },
  sentenceTranslation: {
    color: mobileColors.ink,
    fontSize: 14,
    lineHeight: 22,
  },
  suggestionChip: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: mobileColors.surfaceMuted,
    borderColor: "#d8d8d2",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 12,
  },
  suggestionList: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestionPrefix: {
    color: mobileColors.primary,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 18,
  },
  suggestionText: {
    color: mobileColors.primary,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  translationNoteList: {
    gap: 12,
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
    minHeight: 66,
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
    gap: 16,
    minHeight: 0,
    padding: 18,
    shadowColor: mobileColors.ink,
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
  },
  vocabularyListWrap: {
    gap: 12,
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
