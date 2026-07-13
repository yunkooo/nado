import { useEffect, useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { MAX_ANALYSIS_TEXT_LENGTH } from "@nado/shared/analysis-input";
import { signInWithGoogle, signOut } from "./src/auth/authClient";
import { useMobileAuthState } from "./src/auth/authState";
import { AnalysisModelSelector } from "./src/components/AnalysisModelSelector";
import { MobileAppShell } from "./src/components/MobileAppShell";
import { StatusCard } from "./src/components/StatusCard";
import {
  ANALYSIS_INPUT_ACCESSIBILITY_LABEL,
  getMobileTabs,
  type MobileTabKey,
} from "./src/features/analysis/analysisScreen";
import { useMobileAnalysisController } from "./src/features/analysis/useMobileAnalysisController";
import { useMobileVocabulary } from "./src/features/vocabulary/useMobileVocabulary";
import { AnalysisResultPanel } from "./src/screens/AnalysisResultPanel";
import { ReviewScreen } from "./src/screens/ReviewScreen";
import { VocabularyScreen } from "./src/screens/VocabularyScreen";
import { mobileColors, styles } from "./src/styles/mobileStyles";

export default function App() {
  return <NadoApp />;
}

export function NadoApp({
  designDemoContent = null,
}: {
  designDemoContent?: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<MobileTabKey>("analysis");
  const [authActionMessage, setAuthActionMessage] = useState<string | null>(
    null,
  );
  const authState = useMobileAuthState();
  const analysis = useMobileAnalysisController(authState);
  const isStudyTabActive = activeTab === "vocabulary" || activeTab === "review";
  const [vocabularyState, vocabularyActions] = useMobileVocabulary(
    authState,
    isStudyTabActive,
    activeTab,
  );
  const { clearSaveMessage, saveMessage } = vocabularyActions;
  const navigationTabs = getMobileTabs({
    showDesignDemo: designDemoContent !== null,
  });
  const authMessage = authState.message ?? authActionMessage;

  useEffect(() => {
    if (!saveMessage) {
      return;
    }

    const timeoutId = setTimeout(() => {
      clearSaveMessage();
    }, 2400);

    return () => clearTimeout(timeoutId);
  }, [clearSaveMessage, saveMessage]);

  const handleAuthPress = async () => {
    if (authState.status === "authenticated") {
      const result = await signOut();
      setAuthActionMessage(result.status === "error" ? result.message : null);
      return;
    }

    const result = await signInWithGoogle();
    setAuthActionMessage(result.status === "error" ? result.message : null);
  };

  return (
    <MobileAppShell
      activeTab={activeTab}
      authStatus={authState.status}
      navigationTabs={navigationTabs}
      onAuthPress={() => {
        void handleAuthPress();
      }}
      onSelectTab={setActiveTab}
      overlay={
        <AnalysisModelSelector
          onClose={analysis.closeModelSelector}
          onSelect={analysis.selectModel}
          selectedModel={analysis.selectedModel}
          visible={analysis.isModelSelectorOpen}
        />
      }
      saveMessage={saveMessage}
    >
      {activeTab === "analysis" ? (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {authMessage ? (
            <StatusCard
              message={authMessage}
              title="로그인 안내"
              tone="error"
            />
          ) : null}
          <AnalysisResultPanel
            analysisState={analysis.analysisState}
            getSuggestionState={vocabularyActions.getSuggestionState}
            onSaveSuggestion={vocabularyActions.saveSuggestion}
          />
          <View style={styles.composerWrap}>
            {analysis.composerState.helperText ? (
              <Text style={styles.inputDisclosure}>
                {analysis.composerState.helperText}
              </Text>
            ) : null}
            <View style={styles.composer}>
              <TextInput
                accessibilityLabel={ANALYSIS_INPUT_ACCESSIBILITY_LABEL}
                multiline
                maxLength={MAX_ANALYSIS_TEXT_LENGTH}
                onChangeText={analysis.changeText}
                placeholder={analysis.composerState.placeholderText}
                placeholderTextColor={mobileColors.inkMuted}
                style={[styles.input, styles.inputFocusReset]}
                textAlignVertical="top"
                value={analysis.text}
              />
              <View style={styles.composerFooter}>
                <View style={styles.composerMeta}>
                  <Pressable
                    accessibilityLabel="AI 모델 선택"
                    accessibilityRole="button"
                    onPress={analysis.openModelSelector}
                    style={({ pressed }) => [
                      styles.modelSelectButton,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <Text style={styles.modelSelectText}>
                      {analysis.selectedModelLabel}
                    </Text>
                    <View style={styles.modelSelectChevron} />
                  </Pressable>
                  <Text style={styles.count}>
                    {analysis.composerState.countLabel}
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="분석 요청"
                  accessibilityRole="button"
                  disabled={analysis.isAnalyzeDisabled}
                  onPress={() => {
                    void analysis.analyze();
                  }}
                  style={({ pressed }) => [
                    styles.analyzeButton,
                    analysis.isAnalyzeVisuallyDisabled
                      ? styles.analyzeButtonDisabled
                      : null,
                    pressed && !analysis.isAnalyzeDisabled
                      ? styles.pressed
                      : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.analyzeButtonText,
                      analysis.isAnalyzeVisuallyDisabled
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
        </ScrollView>
      ) : null}
      {activeTab === "vocabulary" ? (
        <VocabularyScreen
          authMessage={authMessage}
          authStatus={authState.status}
          deletingMeaningKeys={vocabularyActions.deletingMeaningKeys}
          isRefreshing={vocabularyActions.isRefreshing}
          onDeleteMeaning={vocabularyActions.deleteMeaning}
          onRefresh={vocabularyActions.refreshVocabulary}
          vocabularyState={vocabularyState}
        />
      ) : null}
      {activeTab === "review" ? (
        <ReviewScreen
          authMessage={authMessage}
          authStatus={authState.status}
          isRefreshing={vocabularyActions.isRefreshing}
          onRefresh={vocabularyActions.refreshVocabulary}
          vocabularyState={vocabularyState}
        />
      ) : null}
      {activeTab === "designDemo" && designDemoContent ? (
        <ScrollView contentContainerStyle={styles.content}>
          {designDemoContent}
        </ScrollView>
      ) : null}
    </MobileAppShell>
  );
}
