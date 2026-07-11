"use client";

import { useEffect } from "react";
import {
  ANALYSIS_MODELS,
  MAX_ANALYSIS_TEXT_LENGTH,
  countAnalysisTextCharacters,
  type AnalysisModelId,
} from "@nado/shared";
import { AnalysisResult, InputComposer, InputSample } from "@nado/ui";
import { AppShell } from "../components/AppShell";
import { useAnalysisPageState } from "../features/analysis/analysisState";
import { useAnalysisSubmission } from "../features/analysis/useAnalysisSubmission";
import { useVocabularySaveNoticeDismiss } from "../features/analysis/useVocabularySaveNoticeDismiss";
import { useVocabularySuggestionSaver } from "../features/analysis/useVocabularySuggestionSaver";
import { VocabularySaveStatus } from "../features/analysis/VocabularySaveStatus";
import { useAuthState } from "../features/auth/authState";
import { useVocabularyState } from "../features/vocabulary/vocabularyState";

const inputDisclosure = "입력문은 분석에만 사용되며 저장되지 않습니다.";

export default function HomePage() {
  const authState = useAuthState();
  const { snapshot, store: analysisStore } = useAnalysisPageState();
  const vocabularyState = useVocabularyState();
  const userId = authState.session?.user.id ?? null;
  const isAnalysisScopeCurrent =
    authState.status !== "loading" && snapshot.ownerUserId === userId;
  const analysisState = isAnalysisScopeCurrent
    ? snapshot.analysisState
    : { status: "idle" as const };
  const selectedAnalysisModel = snapshot.selectedAnalysisModel;
  const text = isAnalysisScopeCurrent ? snapshot.text : "";
  const vocabularySaveMessage = isAnalysisScopeCurrent
    ? snapshot.vocabularySaveMessage
    : null;
  const vocabularySaveStates = isAnalysisScopeCurrent
    ? snapshot.vocabularySaveStates
    : {};

  useEffect(() => {
    if (authState.status === "loading") {
      return;
    }

    analysisStore.syncUserScope(userId);
    analysisStore.setVocabularySaveMessage(null);
    analysisStore.setVocabularySaveStates({});
  }, [analysisStore, authState.status, userId]);

  const handleSubmitAnalysis = useAnalysisSubmission({
    analysisState,
    selectedAnalysisModel,
    store: analysisStore,
    text,
    userId,
  });
  const {
    getSuggestionState: getVocabularySuggestionState,
    saveSuggestion: handleSaveVocabularySuggestion,
  } = useVocabularySuggestionSaver({
    store: analysisStore,
    userId,
    vocabularySaveStates,
    vocabularyState,
  });

  useVocabularySaveNoticeDismiss(vocabularySaveMessage, analysisStore);
  const hasAnalysisResult = analysisState.status === "success";
  const handleModelChange = (value: string) => {
    if (!ANALYSIS_MODELS.some((model) => model.id === value)) {
      return;
    }

    analysisStore.setSelectedAnalysisModel(value as AnalysisModelId);
  };
  const handleTextChange = (nextText: string) => {
    if (!isAnalysisScopeCurrent) {
      analysisStore.syncUserScope(userId);
    }

    analysisStore.setText(nextText);
  };

  return (
    <AppShell activeItem="analysis" workspaceLabel="분석 화면">
      <section
        className={[
          "nado-analysis-workspace",
          hasAnalysisResult ? "nado-analysis-workspace--has-result" : null,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="nado-analysis-page">
          {hasAnalysisResult ? (
            <>
              <InputSample
                count={countAnalysisTextCharacters(
                  analysisState.data.sourceText,
                )}
                maxLength={MAX_ANALYSIS_TEXT_LENGTH}
                text={analysisState.data.sourceText}
              />
              <VocabularySaveStatus message={vocabularySaveMessage} />
              <AnalysisResult
                getVocabularySuggestionState={getVocabularySuggestionState}
                onSaveVocabularySuggestion={handleSaveVocabularySuggestion}
                result={analysisState.data}
              />
            </>
          ) : null}
          {analysisState.status === "loading" ? (
            <section className="nado-analysis-status" role="status">
              분석 중이에요.
            </section>
          ) : null}
          {analysisState.status === "error" ||
          analysisState.status === "not_analyzable" ? (
            <section className="nado-analysis-status" role="alert">
              {analysisState.message}
            </section>
          ) : null}
        </div>
      </section>

      <footer className="nado-composer-wrap">
        <p className="nado-input-disclosure">{inputDisclosure}</p>
        <InputComposer
          maxLength={MAX_ANALYSIS_TEXT_LENGTH}
          modelOptions={ANALYSIS_MODELS}
          modelValue={selectedAnalysisModel}
          onSubmit={handleSubmitAnalysis}
          onModelChange={handleModelChange}
          onValueChange={handleTextChange}
          placeholder="영어 문장이나 짧은 문단을 붙여넣으세요"
          submitAriaLabel="분석 요청"
          value={text}
        />
      </footer>
    </AppShell>
  );
}
