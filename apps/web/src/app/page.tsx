"use client";

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
import { useVocabularyState } from "../features/vocabulary/vocabularyState";

const inputDisclosure = "입력문은 분석에만 사용되며 저장되지 않습니다.";

export default function HomePage() {
  const {
    snapshot: {
      analysisState,
      selectedAnalysisModel,
      text,
      vocabularySaveMessage,
      vocabularySaveStates,
    },
    store: analysisStore,
  } = useAnalysisPageState();
  const vocabularyState = useVocabularyState();
  const handleSubmitAnalysis = useAnalysisSubmission({
    analysisState,
    selectedAnalysisModel,
    store: analysisStore,
    text,
  });
  const {
    getSuggestionState: getVocabularySuggestionState,
    saveSuggestion: handleSaveVocabularySuggestion,
  } = useVocabularySuggestionSaver({
    store: analysisStore,
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
          onValueChange={analysisStore.setText}
          placeholder="영어 문장이나 짧은 문단을 붙여넣으세요"
          submitAriaLabel="분석 요청"
          value={text}
        />
      </footer>
    </AppShell>
  );
}
