import { Fragment, useEffect, useRef, useState } from "react";
import type { ElementRef, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Dimensions,
  Modal,
  Pressable,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  ANALYSIS_MODELS,
  DEFAULT_ANALYSIS_MODEL_ID,
  MAX_ANALYSIS_TEXT_LENGTH,
  analysisModelIdSchema,
  createVocabularyMeaningRenderKey,
  getDistinctVocabularyNote,
  type AnalysisModelId,
} from "@nado/shared";
import {
  ANALYSIS_INPUT_ACCESSIBILITY_LABEL,
  INITIAL_ANALYSIS_TEXT,
  getAnalysisComposerState,
  getAnalysisSourceSampleState,
  mobileTabs,
} from "./src/features/analysis/analysisScreen";
import { getVisibleMobileTranslationNoteParts } from "./src/features/analysis/translationNotes";
import {
  MOBILE_WORD_POPOVER_DEFAULT_HEIGHT,
  MOBILE_WORD_POPOVER_DEFAULT_WIDTH,
  getMobileWordPopoverPosition,
  type MobileWordPopoverRect,
  type MobileWordPopoverSize,
} from "./src/features/analysis/wordPopoverPlacement";
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
import type {
  AnalyzeTextResult,
  MobileSentenceAnalysis,
  MobileVocabularyItem,
} from "./src/api/analysisApi";
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

type MobileVocabularyPopoverSelection = {
  item: MobileVocabularyItem;
  triggerRect: MobileWordPopoverRect;
};

type MobileVocabularySelectionHandler = (
  selection: MobileVocabularyPopoverSelection | null,
) => void;

const configuredMobileApiBaseUrl = readMobileApiBaseUrl();
const configuredMobileApiPlatform = Platform.OS;
const MOBILE_ANALYSIS_MODEL_STORAGE_KEY = "nado.mobile.analysis-model.v1";

export default function App() {
  const [text, setText] = useState(INITIAL_ANALYSIS_TEXT);
  const [selectedAnalysisModel, setSelectedAnalysisModel] =
    useState<AnalysisModelId>(DEFAULT_ANALYSIS_MODEL_ID);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
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
  const isAnalyzeVisuallyDisabled = composerState.isSubmitDisabled;
  const selectedAnalysisModelLabel =
    ANALYSIS_MODELS.find((model) => model.id === selectedAnalysisModel)
      ?.label ?? ANALYSIS_MODELS[0].label;
  const studyRefreshControl = isStudyTabActive ? (
    <RefreshControl
      colors={[mobileColors.primary]}
      onRefresh={vocabularyActions.refreshVocabulary}
      refreshing={vocabularyActions.isRefreshing}
      tintColor={mobileColors.inkMuted}
    />
  ) : undefined;

  useEffect(() => {
    let isMounted = true;

    void AsyncStorage.getItem(MOBILE_ANALYSIS_MODEL_STORAGE_KEY).then(
      (value) => {
        if (isMounted && isAnalysisModelId(value)) {
          setSelectedAnalysisModel(value);
        }
      },
    );

    return () => {
      isMounted = false;
    };
  }, []);

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

  const handleSelectAnalysisModel = (modelId: AnalysisModelId) => {
    setSelectedAnalysisModel(modelId);
    setIsModelSelectorOpen(false);
    void AsyncStorage.setItem(MOBILE_ANALYSIS_MODEL_STORAGE_KEY, modelId);
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
      model: selectedAnalysisModel,
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
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={styles.logoMark}
            >
              <Text style={styles.logoMarkText}>n</Text>
            </View>
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
          {activeTab === "analysis" ? (
            <View style={styles.composerWrap}>
              {composerState.helperText ? (
                <Text style={styles.inputDisclosure}>
                  {composerState.helperText}
                </Text>
              ) : null}
              <View style={styles.composer}>
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
                  <View style={styles.composerMeta}>
                    <Pressable
                      accessibilityLabel="AI 모델 선택"
                      accessibilityRole="button"
                      onPress={() => setIsModelSelectorOpen(true)}
                      style={({ pressed }) => [
                        styles.modelSelectButton,
                        pressed ? styles.pressed : null,
                      ]}
                    >
                      <Text style={styles.modelSelectText}>
                        {selectedAnalysisModelLabel}
                      </Text>
                      <View style={styles.modelSelectChevron} />
                    </Pressable>
                    <Text style={styles.count}>{composerState.countLabel}</Text>
                  </View>
                  <Pressable
                    accessibilityLabel="분석 요청"
                    accessibilityRole="button"
                    disabled={isAnalyzeDisabled}
                    onPress={handleAnalyzePress}
                    style={({ pressed }) => [
                      styles.analyzeButton,
                      isAnalyzeVisuallyDisabled
                        ? styles.analyzeButtonDisabled
                        : null,
                      pressed && !isAnalyzeDisabled ? styles.pressed : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.analyzeButtonText,
                        isAnalyzeVisuallyDisabled
                          ? styles.analyzeButtonTextDisabled
                          : null,
                      ]}
                    >
                      ↑
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}
          {activeTab === "vocabulary" ? (
            <VocabularyPage
              authStatus={authState.status}
              deletingItemId={vocabularyActions.deletingItemId}
              isRefreshing={vocabularyActions.isRefreshing}
              onDeleteItem={vocabularyActions.deleteItem}
              onRefresh={vocabularyActions.refreshVocabulary}
              vocabularyState={vocabularyState}
            />
          ) : null}
          {activeTab === "review" ? (
            <ReviewPage
              authStatus={authState.status}
              isRefreshing={vocabularyActions.isRefreshing}
              onRefresh={vocabularyActions.refreshVocabulary}
              vocabularyState={vocabularyState}
            />
          ) : null}
        </ScrollView>

        <View style={styles.bottomArea}>
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
        <AnalysisModelSelector
          onClose={() => setIsModelSelectorOpen(false)}
          onSelect={handleSelectAnalysisModel}
          selectedModel={selectedAnalysisModel}
          visible={isModelSelectorOpen}
        />
      </View>
    </SafeAreaView>
  );
}

function AnalysisModelSelector({
  onClose,
  onSelect,
  selectedModel,
  visible,
}: {
  onClose: () => void;
  onSelect: (modelId: AnalysisModelId) => void;
  selectedModel: AnalysisModelId;
  visible: boolean;
}) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modelSelectorOverlay}>
        <Pressable
          accessibilityLabel="AI 모델 선택 닫기"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.modelSelectorDismissLayer}
        />
        <View accessibilityRole="menu" style={styles.modelSelectorCard}>
          {ANALYSIS_MODELS.map((model) => {
            const selected = model.id === selectedModel;

            return (
              <Pressable
                accessibilityRole="menuitem"
                accessibilityState={{ selected }}
                key={model.id}
                onPress={() => onSelect(model.id)}
                style={({ pressed }) => [
                  styles.modelSelectorOption,
                  selected ? styles.modelSelectorOptionActive : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text
                  style={[
                    styles.modelSelectorOptionText,
                    selected ? styles.modelSelectorOptionTextActive : null,
                  ]}
                >
                  {model.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

function isAnalysisModelId(value: unknown): value is AnalysisModelId {
  return analysisModelIdSchema.safeParse(value).success;
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

function MobileSentenceAnalysisCard({
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

function MobileVocabularyWordCard({
  getSuggestionState,
  item,
  onLayout,
  onSaveSuggestion,
  style,
}: {
  getSuggestionState: MobileVocabularyActions["getSuggestionState"];
  item: MobileVocabularyItem;
  onLayout?: (event: LayoutChangeEvent) => void;
  onSaveSuggestion: MobileVocabularyActions["saveSuggestion"];
  style?: StyleProp<ViewStyle>;
}) {
  const suggestionState = getSuggestionState(item);
  const isSaveDisabled = suggestionState !== "idle";

  return (
    <View
      accessibilityLabel={`${item.term} 뜻과 저장 액션`}
      onLayout={onLayout}
      style={[styles.wordDefinitionCard, style]}
    >
      <View style={styles.wordDefinitionHeader}>
        <Text style={styles.wordDefinitionTerm}>{item.term}</Text>
        {item.partOfSpeech ? (
          <Text style={styles.wordDefinitionPartOfSpeech}>
            {item.partOfSpeech}
          </Text>
        ) : null}
      </View>
      <Text style={styles.wordDefinitionMeaning}>{item.meaning}</Text>
      <Text style={styles.wordDefinitionContext}>{item.contextMeaning}</Text>
      <Pressable
        accessibilityLabel={readSuggestionSaveActionLabel(
          item.term,
          suggestionState,
        )}
        accessibilityRole="button"
        accessibilityState={{ disabled: isSaveDisabled }}
        disabled={isSaveDisabled}
        onPress={() => {
          void onSaveSuggestion(item);
        }}
        style={({ pressed }) => [
          styles.wordDefinitionSaveButton,
          isSaveDisabled ? styles.wordDefinitionSaveButtonDisabled : null,
          pressed && !isSaveDisabled ? styles.pressed : null,
        ]}
      >
        <Text style={styles.wordDefinitionSaveButtonText}>
          {readSuggestionSaveActionText(suggestionState)}
        </Text>
      </Pressable>
    </View>
  );
}

function MobileVocabularyWordPopover({
  getSuggestionState,
  onClose,
  onSaveSuggestion,
  selection,
}: {
  getSuggestionState: MobileVocabularyActions["getSuggestionState"];
  onClose: () => void;
  onSaveSuggestion: MobileVocabularyActions["saveSuggestion"];
  selection: MobileVocabularyPopoverSelection;
}) {
  const [popoverSize, setPopoverSize] = useState<MobileWordPopoverSize>({
    height: MOBILE_WORD_POPOVER_DEFAULT_HEIGHT,
    width: MOBILE_WORD_POPOVER_DEFAULT_WIDTH,
  });
  const viewportSize = Dimensions.get("window");
  const popoverPosition = getMobileWordPopoverPosition({
    popoverSize,
    triggerRect: selection.triggerRect,
    viewportSize,
  });

  const handlePopoverLayout = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    const nextSize = {
      height: Math.max(1, Math.round(height)),
      width: Math.max(1, Math.round(width)),
    };

    if (
      nextSize.height === Math.round(popoverSize.height) &&
      nextSize.width === Math.round(popoverSize.width)
    ) {
      return;
    }

    setPopoverSize(nextSize);
  };

  return (
    <Modal animationType="none" onRequestClose={onClose} transparent visible>
      <View pointerEvents="box-none" style={styles.wordPopoverOverlay}>
        <Pressable
          accessibilityLabel="단어 뜻 닫기"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.wordPopoverDismissLayer}
        />
        <MobileVocabularyWordCard
          getSuggestionState={getSuggestionState}
          item={selection.item}
          onLayout={handlePopoverLayout}
          onSaveSuggestion={onSaveSuggestion}
          style={[
            styles.wordDefinitionPopoverCard,
            {
              left: popoverPosition.left,
              maxHeight: popoverPosition.height,
              top: popoverPosition.top,
              width: popoverPosition.width,
            },
          ]}
        />
      </View>
    </Modal>
  );
}

type MobileVocabularyAwareTextOptions = {
  onSelectVocabulary: MobileVocabularySelectionHandler;
  selectedVocabularyKey: string | null;
  startTokenIndex: number;
  text: string;
  tokens: MobileSentenceAnalysis["tokens"];
  vocabularyItemByKey: Map<string, MobileVocabularyItem>;
};

const englishWordPattern = /[A-Za-z]+(?:['’-][A-Za-z]+)*/g;

function renderMobileVocabularyAwareText({
  onSelectVocabulary,
  selectedVocabularyKey,
  startTokenIndex,
  text,
  tokens,
  vocabularyItemByKey,
}: MobileVocabularyAwareTextOptions) {
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

    const tokenMatch = findMatchingSentenceToken(tokens, tokenIndex, word);
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

function MobileVocabularyWordToken({
  accessibilityLabel,
  isSelected,
  item,
  onSelectVocabulary,
  text,
}: {
  accessibilityLabel: string;
  isSelected: boolean;
  item: MobileVocabularyItem;
  onSelectVocabulary: MobileVocabularySelectionHandler;
  text: string;
}) {
  const tokenRef = useRef<ElementRef<typeof Pressable>>(null);

  const handlePress = (event: GestureResponderEvent) => {
    if (isSelected) {
      onSelectVocabulary(null);
      return;
    }

    const fallbackRect = {
      height: 28,
      width: Math.max(24, text.length * 12),
      x: Math.max(0, event.nativeEvent.pageX - 12),
      y: Math.max(0, event.nativeEvent.pageY - 14),
    };

    const token = tokenRef.current as {
      measureInWindow?: (
        callback: (x: number, y: number, width: number, height: number) => void,
      ) => void;
    } | null;

    if (typeof token?.measureInWindow === "function") {
      token.measureInWindow((x, y, width, height) => {
        onSelectVocabulary({
          item,
          triggerRect:
            width > 0 && height > 0 ? { height, width, x, y } : fallbackRect,
        });
      });
      return;
    }

    onSelectVocabulary({
      item,
      triggerRect: fallbackRect,
    });
  };

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ expanded: isSelected }}
      onPress={handlePress}
      ref={tokenRef}
      style={({ pressed }) => [
        styles.wordToken,
        isSelected ? styles.wordTokenActive : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text style={styles.chunkEnglish}>{text}</Text>
    </Pressable>
  );
}

function findMatchingSentenceToken(
  tokens: MobileSentenceAnalysis["tokens"],
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

function readSuggestionSavePrefix(state: "idle" | "saved" | "saving") {
  if (state === "saving") {
    return "저장 중";
  }

  if (state === "saved") {
    return "✓";
  }

  return "+";
}

function readSuggestionSaveActionText(state: "idle" | "saved" | "saving") {
  if (state === "saving") {
    return "저장 중";
  }

  if (state === "saved") {
    return "✓";
  }

  return "+ 저장";
}

function readSuggestionSaveActionLabel(
  term: string,
  state: "idle" | "saved" | "saving",
) {
  if (state === "saving") {
    return `${term} 저장 중`;
  }

  if (state === "saved") {
    return `${term} 저장됨`;
  }

  return `${term} 저장`;
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

function StatusCard({
  message,
  title,
  tone = "neutral",
}: {
  message: string;
  title: string | null;
  tone?: "error" | "neutral";
}) {
  return (
    <View
      accessibilityRole={tone === "error" ? "alert" : undefined}
      style={styles.statusCard}
    >
      {title ? <Text style={styles.statusTitle}>{title}</Text> : null}
      <Text style={styles.statusText}>{message}</Text>
    </View>
  );
}

function VocabularyPage({
  authStatus,
  deletingItemId,
  isRefreshing,
  onDeleteItem,
  onRefresh,
  vocabularyState,
}: {
  authStatus: MobileAuthState["status"];
  deletingItemId: string | null;
  isRefreshing: boolean;
  onDeleteItem: (itemId: string) => void;
  onRefresh: () => void;
  vocabularyState: MobileVocabularyState;
}) {
  const panelState = getMobileVocabularyPanelState(authStatus, vocabularyState);
  const isSummaryAvailable = panelState === "empty" || panelState === "list";
  const isRefreshDisabled =
    authStatus !== "authenticated" ||
    isRefreshing ||
    vocabularyState.status === "loading";

  return (
    <View style={styles.pageStack}>
      <View style={styles.pageHeader}>
        <View style={styles.pageTitleGroup}>
          <Text style={styles.eyebrow}>Vocabulary</Text>
          <Text style={styles.pageTitle}>단어장</Text>
        </View>
        <MobileRefreshButton
          isDisabled={isRefreshDisabled}
          isRefreshing={isRefreshing}
          onRefresh={onRefresh}
        />
      </View>

      <View style={styles.pageLayout}>
        <View style={styles.summaryItem} accessibilityLabel="단어장 요약">
          <Text style={styles.summaryLabel}>저장 항목</Text>
          <Text style={styles.summaryValue}>
            {isSummaryAvailable ? String(vocabularyState.items.length) : "-"}
          </Text>
        </View>

        <View style={styles.vocabularyListWrap}>
          {panelState === "list" ? (
            <>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleGroup}>
                  <Text style={styles.eyebrow}>My vocabulary</Text>
                  <Text style={styles.sectionTitle}>
                    저장한 단어를 확인해요
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
                    {item.meanings.map((meaning, meaningIndex) => {
                      const meaningDisplayNote = getDistinctVocabularyNote(
                        meaning.note,
                        [meaning.meaning],
                      );

                      return (
                        <View
                          key={createVocabularyMeaningRenderKey(
                            item.id,
                            meaning,
                            meaningIndex,
                          )}
                          style={styles.meaningCard}
                        >
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
  isRefreshing,
  onRefresh,
  vocabularyState,
}: {
  authStatus: MobileAuthState["status"];
  isRefreshing: boolean;
  onRefresh: () => void;
  vocabularyState: MobileVocabularyState;
}) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [direction, setDirection] =
    useState<ReviewDirection>("english-to-korean");
  const panelState = getMobileVocabularyPanelState(authStatus, vocabularyState);
  const isRefreshDisabled =
    authStatus !== "authenticated" ||
    isRefreshing ||
    vocabularyState.status === "loading";
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
          <Text style={styles.eyebrow}>Review</Text>
          <Text style={styles.pageTitle}>복습</Text>
        </View>
        <MobileRefreshButton
          isDisabled={isRefreshDisabled}
          isRefreshing={isRefreshing}
          onRefresh={onRefresh}
        />
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
              <Text style={styles.eyebrow}>My flashcard</Text>
              <Text style={styles.reviewMeta}>
                {currentCardIndex + 1} / {vocabularyState.items.length}
              </Text>
              <Text style={styles.reviewTerm}>{currentCard.prompt}</Text>
              <Text
                accessibilityElementsHidden={
                  isAnswerRevealed ? undefined : true
                }
                importantForAccessibility={
                  isAnswerRevealed ? "auto" : "no-hide-descendants"
                }
                style={[
                  styles.reviewAnswer,
                  isAnswerRevealed ? styles.reviewAnswerRevealed : null,
                ]}
              >
                {currentCard.answer}
              </Text>
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

function MobileRefreshButton({
  isDisabled,
  isRefreshing,
  onRefresh,
}: {
  isDisabled: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel="단어장 새로고침"
      accessibilityRole="button"
      accessibilityState={{ busy: isRefreshing, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onRefresh}
      style={({ pressed }) => [
        styles.refreshButton,
        isDisabled ? styles.refreshButtonDisabled : null,
        pressed && !isDisabled ? styles.pressed : null,
      ]}
    >
      <Text style={styles.refreshButtonIcon}>↻</Text>
    </Pressable>
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
