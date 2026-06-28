import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(
  new URL("../../App.tsx", import.meta.url),
  "utf8",
);
const authClientSource = readFileSync(
  new URL("../auth/authClient.ts", import.meta.url),
  "utf8",
);
const authStateSource = readFileSync(
  new URL("../auth/authState.ts", import.meta.url),
  "utf8",
);
const mobileVocabularySource = readFileSync(
  new URL("../features/vocabulary/useMobileVocabulary.ts", import.meta.url),
  "utf8",
);
const mobileVocabularyRealtimeSource = readFileSync(
  new URL(
    "../features/vocabulary/mobileVocabularyRealtime.ts",
    import.meta.url,
  ),
  "utf8",
);
const uiNativeImport =
  'import { Badge, Button, Card, Chip } from "@nado/ui/native";';

describe("mobile App API wiring", () => {
  it("submits analysis text through the mobile analyze API client", () => {
    expect(appSource).toContain("analyzeText");
    expect(appSource).toContain('setAnalysisState({ status: "loading" })');
    expect(appSource).toContain("await analyzeText");
    expect(appSource).toContain("model: selectedAnalysisModel");
    expect(appSource).toContain('setText("")');
  });

  it("renders and persists the mobile analysis model selector", () => {
    expect(appSource).toContain("@react-native-async-storage/async-storage");
    expect(appSource).toContain("ANALYSIS_MODELS");
    expect(appSource).toContain("selectedAnalysisModel");
    expect(appSource).toContain("setSelectedAnalysisModel");
    expect(appSource).toContain("nado.mobile.analysis-model.v1");
    expect(appSource).toContain('accessibilityLabel="AI 모델 선택"');
    expect(appSource).toContain("styles.modelSelectChevron");
    expect(appSource).not.toContain("기본 분석");
  });

  it("keeps the analyze button icon stable while analysis is loading", () => {
    expect(appSource).toContain(
      "const isAnalyzeVisuallyDisabled = composerState.isSubmitDisabled;",
    );
    expect(appSource).not.toContain('isAnalysisLoading ? "..." : "↑"');
    expect(appSource).not.toContain(">...</Text>");
  });

  it("keeps the analysis composer in the scroll content instead of the fixed bottom area", () => {
    const scrollViewStart = appSource.indexOf("<ScrollView");
    const scrollViewEnd = appSource.indexOf("</ScrollView>");
    const composerWrap = appSource.indexOf("styles.composerWrap");
    const bottomArea = appSource.indexOf("styles.bottomArea");

    expect(composerWrap).toBeGreaterThan(scrollViewStart);
    expect(composerWrap).toBeLessThan(scrollViewEnd);
    expect(composerWrap).toBeLessThan(bottomArea);
  });

  it("mounts the mobile design demo only when the explicit demo flag exposes it", () => {
    expect(appSource).toContain("MobileTokenParityDemoScreen");
    expect(appSource).toContain("readMobileDesignDemoEnabled");
    expect(appSource).toMatch(
      /getMobileTabs\(\{\s*showDesignDemo:\s*isMobileDesignDemoEnabled,\s*\}\)/,
    );
    expect(appSource).toContain('activeTab === "designDemo"');
    expect(appSource).not.toContain('label: "디자인"');
  });

  it("renders analyzed source text with a bottom-right character count", () => {
    expect(appSource).toContain("getAnalysisSourceSampleState");
    expect(appSource).toContain("styles.sourceSample");
    expect(appSource).toContain("styles.sourceSampleText");
    expect(appSource).toContain("styles.sourceSampleCount");
  });

  it("does not render analysis result helper copy on mobile", () => {
    expect(appSource).not.toContain(
      "자연스러운 번역, 문장별 끊어읽기 직역, 문법 포인트, 단어 추천을 한",
    );
    expect(appSource).not.toContain("200자 이내 기본 분석");
  });

  it("renders the natural translation without a visible section title on mobile", () => {
    expect(appSource).not.toContain('title="전체 자연스러운 번역"');
    expect(appSource).toContain('accessibilityLabel="자연스러운 번역"');
    expect(appSource).toContain("styles.resultTranslation");
  });

  it("uses the shared mobile API base URL for configured backends", () => {
    expect(appSource).toContain("readMobileApiBaseUrl");
    expect(appSource).toContain("configuredMobileApiBaseUrl");
  });

  it("connects login and vocabulary screens to real services", () => {
    expect(appSource).toContain("useMobileAuthState");
    expect(appSource).toContain("signInWithGoogle");
    expect(appSource).toContain("signOut");
    expect(appSource).toContain("useMobileVocabulary");
    expect(appSource).not.toContain("mobileVocabularyItems.map");
    expect(appSource).not.toContain("mobileReviewCards");
  });

  it("configures Supabase auth for React Native session persistence and callbacks", () => {
    expect(authClientSource).toContain(
      "@react-native-async-storage/async-storage",
    );
    expect(authClientSource).toContain("react-native-url-polyfill/auto");
    expect(authClientSource).toContain("storage: AsyncStorage");
    expect(authClientSource).toContain(
      'detectSessionInUrl: platformOS === "web"',
    );
    expect(authClientSource).toContain("skipBrowserRedirect");
    expect(authClientSource).toContain("completeMobileAuthFromCallbackUrl");
    expect(authStateSource).toContain("Linking.getInitialURL");
    expect(authStateSource).toContain('Linking.addEventListener("url"');
  });

  it("refreshes mobile vocabulary on study tab entry and app activation", () => {
    expect(appSource).toContain("isStudyTabActive");
    expect(appSource).toMatch(
      /useMobileVocabulary\(\s*authState,\s*isStudyTabActive,\s*activeTab,?\s*\)/,
    );
    expect(mobileVocabularySource).toContain("AppState");
    expect(mobileVocabularySource).toContain(
      'AppState.addEventListener("change"',
    );
    expect(mobileVocabularySource).toContain('nextAppState === "active"');
  });

  it("supports manual refresh controls on mobile study tabs", () => {
    expect(appSource).toContain("RefreshControl");
    expect(appSource).toContain("refreshControl={");
    expect(appSource).toContain("MobileRefreshButton");
    expect(appSource).toContain('accessibilityLabel="단어장 새로고침"');
    expect(appSource).toContain("styles.refreshButtonIcon");
    expect(appSource).toContain("vocabularyActions.isRefreshing");
    expect(appSource).toContain("vocabularyActions.refreshVocabulary");
    expect(mobileVocabularySource).toContain("isRefreshing");
    expect(mobileVocabularySource).toContain(
      "refreshVocabularyInBackground({ force: true })",
    );
  });

  it("throttles manual pull-to-refresh without changing realtime or lifecycle refreshes", () => {
    expect(mobileVocabularySource).toContain(
      "shouldStartVocabularyManualRefresh",
    );
    expect(mobileVocabularySource).toContain(
      "VOCABULARY_MANUAL_REFRESH_THROTTLE_MS",
    );
    expect(mobileVocabularySource).toContain("lastManualRefreshStartedAtRef");
  });

  it("guards mobile vocabulary refreshes against duplicate and stale requests", () => {
    expect(mobileVocabularySource).toContain("requestSequenceRef");
    expect(mobileVocabularySource).toContain("lastLoadedAtRef");
    expect(mobileVocabularySource).toContain(
      "shouldRefreshVocabularyFromLifecycle",
    );
    expect(mobileVocabularySource).toContain('statusRef.current === "loading"');
    expect(mobileVocabularySource).toContain(
      "requestId !== requestSequenceRef.current",
    );
    expect(mobileVocabularySource).toContain(
      "accessTokenRef.current !== accessToken",
    );
  });

  it("subscribes mobile vocabulary to authenticated private Realtime broadcasts", () => {
    expect(mobileVocabularySource).toContain(
      "subscribeMobileVocabularyRealtime",
    );
    expect(mobileVocabularySource).toContain(
      "updateMobileVocabularyRealtimeAuth",
    );
    expect(mobileVocabularySource).toContain(
      "createVocabularyRealtimeRefreshScheduler",
    );
    expect(mobileVocabularySource).toContain(
      "return loadVocabulary(latestAuthState.accessToken",
    );
    expect(mobileVocabularySource).toContain("{ force: true }");
    expect(mobileVocabularySource).toContain("realtimeRefreshSchedulerRef");
    expect(mobileVocabularySource).toContain("authState.session?.user.id");
    expect(mobileVocabularyRealtimeSource).toContain(
      "createVocabularyRealtimeTopic",
    );
    expect(mobileVocabularyRealtimeSource).toContain(
      "config: { private: true }",
    );
    expect(mobileVocabularyRealtimeSource).toContain(
      "client.realtime.setAuth(accessToken)",
    );
    expect(mobileVocabularyRealtimeSource).toContain("client.removeChannel");
  });

  it("filters duplicate vocabulary notes from mobile vocabulary and omits review notes", () => {
    expect(appSource).toContain("getDistinctVocabularyNote");
    expect(appSource).toContain("meaningDisplayNote");
    expect(appSource).not.toContain("currentCard.note");
    expect(appSource).not.toContain("styles.reviewNote");
  });

  it("does not show the saved-from-analysis helper copy in mobile vocabulary", () => {
    expect(appSource).not.toContain("분석에서 저장한 항목이에요");
  });

  it("renders review answers with the same base-and-revealed modifier pattern as web and desktop", () => {
    expect(appSource).not.toContain("styles.reviewAnswerHiddenBox");
    expect(appSource).not.toContain(
      'accessibilityLabel="정답이 가려져 있습니다"',
    );
    expect(appSource).toContain("accessibilityElementsHidden");
    expect(appSource).toContain(
      "isAnswerRevealed ? styles.reviewAnswerRevealed : null",
    );
  });

  it("uses ui-native Button primitives for mobile review actions", () => {
    const reviewActionsStart = appSource.indexOf(
      "<View style={styles.reviewActions}>",
    );
    const reviewActionsEnd = appSource.indexOf("</View>", reviewActionsStart);
    const reviewActionsSource = appSource.slice(
      reviewActionsStart,
      reviewActionsEnd,
    );

    expect(appSource).toContain(uiNativeImport);
    expect(reviewActionsSource).toContain("<Button");
    expect(reviewActionsSource).toContain('variant="secondary"');
    expect(reviewActionsSource).toContain('variant="primary"');
    expect(reviewActionsSource).toContain("style={styles.reviewActionButton}");
    expect(reviewActionsSource).not.toContain("<Pressable");
    expect(reviewActionsSource).not.toContain("styles.secondaryButton");
    expect(reviewActionsSource).not.toContain("styles.primaryButton");
  });

  it("uses the ui-native Card primitive for the vocabulary summary item", () => {
    const summaryLabel = 'accessibilityLabel="단어장 요약"';
    const summaryLabelStart = appSource.indexOf(summaryLabel);
    const summaryStart = appSource.lastIndexOf("<Card", summaryLabelStart);
    const summaryEnd = appSource.indexOf("</Card>", summaryStart);
    const summarySource = appSource.slice(summaryStart, summaryEnd);

    expect(appSource).toContain(uiNativeImport);
    expect(summaryStart).toBeGreaterThan(-1);
    expect(summarySource).toContain(summaryLabel);
    expect(summarySource).toContain('padding="md"');
    expect(summarySource).toContain('radius="md"');
    expect(summarySource).toContain('tone="surface"');
    expect(summarySource).toContain("style={styles.summaryItem}");
    expect(summarySource).not.toContain("<View");
  });

  it("uses the ui-native Card primitive for mobile vocabulary meaning cards", () => {
    const meaningListStart = appSource.indexOf(
      "<View style={styles.meaningList}>",
    );
    const meaningKeyStart = appSource.indexOf(
      "key={createVocabularyMeaningRenderKey",
      meaningListStart,
    );
    const meaningCardStart = appSource.lastIndexOf("<Card", meaningKeyStart);
    const meaningCardEnd = appSource.indexOf("</Card>", meaningCardStart);
    const meaningCardSource = appSource.slice(meaningCardStart, meaningCardEnd);

    expect(appSource).toContain(uiNativeImport);
    expect(meaningListStart).toBeGreaterThan(-1);
    expect(meaningCardStart).toBeGreaterThan(meaningListStart);
    expect(meaningCardSource).toContain(
      "key={createVocabularyMeaningRenderKey",
    );
    expect(meaningCardSource).toContain('padding="md"');
    expect(meaningCardSource).toContain('radius="md"');
    expect(meaningCardSource).toContain('tone="muted"');
    expect(meaningCardSource).toContain("style={styles.meaningCard}");
    expect(meaningCardSource).not.toContain(
      "<View\n                          key={createVocabularyMeaningRenderKey",
    );
  });

  it("uses the ui-native Badge primitive for mobile vocabulary type labels", () => {
    const termGroupStart = appSource.indexOf("<View style={styles.termGroup}>");
    const termGroupEnd = appSource.indexOf("</View>", termGroupStart);
    const termGroupSource = appSource.slice(termGroupStart, termGroupEnd);

    expect(appSource).toContain(uiNativeImport);
    expect(termGroupStart).toBeGreaterThan(-1);
    expect(termGroupSource).toContain("<Badge");
    expect(termGroupSource).toContain('tone="neutral"');
    expect(termGroupSource).toContain('size="sm"');
    expect(termGroupSource).toContain("{item.type}");
    expect(termGroupSource).not.toContain("styles.vocabularyType");
    expect(termGroupSource).not.toContain(
      "<Text style={styles.vocabularyType}>",
    );
  });

  it("uses the ui-native Card primitive for mobile word definition cards", () => {
    const wordCardStart = appSource.indexOf(
      "function MobileVocabularyWordCard",
    );
    const wordCardEnd = appSource.indexOf(
      "function MobileVocabularyWordPopover",
      wordCardStart,
    );
    const wordCardSource = appSource.slice(wordCardStart, wordCardEnd);

    expect(appSource).toContain(uiNativeImport);
    expect(wordCardSource).toContain("<Card");
    expect(wordCardSource).toContain(
      "accessibilityLabel={`${item.term} 뜻과 저장 액션`}",
    );
    expect(wordCardSource).toContain('padding="lg"');
    expect(wordCardSource).toContain('radius="md"');
    expect(wordCardSource).toContain('tone="elevated"');
    expect(wordCardSource).toContain(
      "style={[styles.wordDefinitionCard, style]}",
    );
    expect(wordCardSource).not.toContain(
      "<View\n      accessibilityLabel={`${item.term} 뜻과 저장 액션`}",
    );
  });

  it("uses the ui-native Chip primitive for mobile vocabulary suggestions", () => {
    const suggestionSectionStart = appSource.indexOf(
      '<ResultSection isLast title="우선 저장 추천">',
    );
    const suggestionSectionEnd = appSource.indexOf(
      "</ResultSection>",
      suggestionSectionStart,
    );
    const suggestionSource = appSource.slice(
      suggestionSectionStart,
      suggestionSectionEnd,
    );

    expect(appSource).toContain(uiNativeImport);
    expect(suggestionSource).toContain("<Chip");
    expect(suggestionSource).toContain(
      "accessibilityState={{ disabled: isSavingDisabled }}",
    );
    expect(suggestionSource).toContain("disabled={isSavingDisabled}");
    expect(suggestionSource).toContain(
      "label={`${suggestion.term} · ${suggestion.meaning}`}",
    );
    expect(suggestionSource).toContain(
      "prefix={readSuggestionSavePrefix(suggestionState)}",
    );
    expect(suggestionSource).toContain("void onSaveSuggestion(suggestion);");
    expect(suggestionSource).toContain("styles.suggestionChipSaved");
    expect(suggestionSource).toContain("styles.suggestionChipSaving");
    expect(suggestionSource).not.toContain("<Pressable");
    expect(suggestionSource).not.toContain("styles.suggestionChip,");
    expect(suggestionSource).not.toContain("styles.pressed");
  });

  it("renders tappable sentence vocabulary tokens with save actions", () => {
    expect(appSource).toContain("MobileSentenceAnalysisCard");
    expect(appSource).toContain("MobileVocabularyWordCard");
    expect(appSource).toContain("renderMobileVocabularyAwareText");
    expect(appSource).toContain("vocabularyItemByKey");
    expect(appSource).toContain("selectedVocabularyKey");
    expect(appSource).toContain("onSaveSuggestion(item)");
    expect(appSource).toContain("styles.wordDefinitionCard");
    expect(appSource).toContain("styles.wordTokenActive");
  });

  it("renders the selected vocabulary card as a measured top-or-bottom popover", () => {
    expect(appSource).toContain("renderedText.selectedVocabularyItem");
    expect(appSource).toContain("MobileVocabularyWordPopover");
    expect(appSource).toContain("getMobileWordPopoverPosition");
    expect(appSource).toContain("measureInWindow");
    expect(appSource).toContain("selectedVocabularyPopover");
    expect(appSource).toContain("selectedVocabularyItem = vocabularyItem");
    expect(appSource).toContain("styles.sentenceCardActive");
    expect(appSource).toContain("styles.chunkUnitActive");
    expect(appSource).not.toContain("const selectedItem =");
    expect(appSource).not.toContain("selectedVocabularyItemForCard");
  });

  it("renders mobile reading chunks in the same slash-separated flow as web and desktop", () => {
    expect(appSource).toContain("styles.chunkSlash");
    expect(appSource).toContain("index < sentence.chunks.length - 1");
    expect(appSource).toContain("<Fragment");
  });

  it("uses a check mark instead of visible saved text for disabled saved actions", () => {
    expect(appSource).toContain('return "✓"');
    expect(appSource).not.toContain('return "저장됨"');
    expect(appSource).toContain("return `${term} 저장됨`");
  });
});
