"use client";

import {
  MAX_ANALYSIS_TEXT_LENGTH,
  countAnalysisTextCharacters,
} from "@nado/shared";
import { AnalysisResult, InputComposer, InputSample } from "@nado/ui";
import { AppShell } from "../components/AppShell";
import { useAnalysisPageState } from "../features/analysis/analysisState";
import { useAnalysisSubmission } from "../features/analysis/useAnalysisSubmission";
import { useVocabularySaveNoticeDismiss } from "../features/analysis/useVocabularySaveNoticeDismiss";
import { useVocabularySuggestionSaver } from "../features/analysis/useVocabularySuggestionSaver";
import { VocabularySaveStatus } from "../features/analysis/VocabularySaveStatus";
import { useVocabularyState } from "../features/vocabulary/vocabularyState";

const inputDisclosure =
  "입력한 문장은 AI 분석을 위해 전송되며, 단어장에는 원문 문장을 저장하지 않습니다.";

export default function HomePage() {
  const {
    snapshot: {
      analysisState,
      text,
      vocabularySaveMessage,
      vocabularySaveStates,
    },
    store: analysisStore,
  } = useAnalysisPageState();
  const vocabularyState = useVocabularyState();
  const handleSubmitAnalysis = useAnalysisSubmission({
    analysisState,
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

  return (
    <AppShell activeItem="analysis" workspaceLabel="분석 화면">
      <section className="nado-analysis-workspace">
        <div className="nado-analysis-page">
          {analysisState.status === "success" ? (
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
          onSubmit={handleSubmitAnalysis}
          onValueChange={analysisStore.setText}
          placeholder="영어 문장이나 짧은 문단을 붙여넣으세요"
          submitAriaLabel="분석 요청"
          value={text}
        />
      </footer>
    </AppShell>
  );
}
