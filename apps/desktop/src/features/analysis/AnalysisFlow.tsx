import { Suspense, lazy, useEffect } from "react";
import {
  ANALYSIS_MODELS,
  MAX_ANALYSIS_TEXT_LENGTH,
  countAnalysisTextCharacters,
  hasUnsupportedAnalysisTextCharacters,
  normalizeAnalysisText,
  type AnalysisModelId,
} from "@nado/shared/analysis-input";
import { InputComposer } from "@nado/ui-web/InputComposer";
import { InputSample } from "@nado/ui-web/analysisPrimitives";
import { apiBaseUrl } from "../../api/apiConfig";
import { analyzeText } from "../../api/analysisApi";
import { useAnalysisPageState } from "./analysisState";
import { getCurrentAccessToken } from "../../auth/authClient";
import { getAuthStateSnapshot, useAuthState } from "../../auth/authState";
import { useVocabularyStateForAuth } from "../vocabulary/vocabularyState";
import { useVocabularySuggestionSaver } from "./useVocabularySuggestionSaver";

const inputDisclosure =
  "입력문은 분석을 위해 전송되며 서버에는 저장되지 않습니다.";
const VOCABULARY_SAVE_NOTICE_DISMISS_MS = 2500;
const AnalysisResult = lazy(() => import("./AnalysisResultPanel"));
const analysisResultFallback = (
  <section className="desktop-analysis-status" role="status">
    분석 결과를 불러오는 중이에요.
  </section>
);

export function AnalysisFlow() {
  const authState = useAuthState();
  const vocabularyState = useVocabularyStateForAuth(authState);
  const { snapshot, store: analysisStore } = useAnalysisPageState();

  const currentUserId = authState.session?.user.id ?? null;
  const isAnalysisScopeCurrent =
    authState.status !== "loading" && snapshot.ownerUserId === currentUserId;
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
  const vocabularySuggestionSaver = useVocabularySuggestionSaver({
    store: analysisStore,
    userId: currentUserId,
    vocabularySaveStates,
    vocabularyState,
  });

  useEffect(() => {
    return () => {
      analysisStore.setVocabularySaveMessage(null);
    };
  }, [analysisStore]);

  useEffect(() => {
    if (!vocabularySaveMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      analysisStore.setVocabularySaveMessage(null);
    }, VOCABULARY_SAVE_NOTICE_DISMISS_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [analysisStore, vocabularySaveMessage]);

  const handleSubmitAnalysis = async () => {
    const nextText = normalizeAnalysisText(text);
    const nextTextLength = countAnalysisTextCharacters(nextText);

    if (
      analysisState.status === "loading" ||
      nextTextLength === 0 ||
      nextTextLength > MAX_ANALYSIS_TEXT_LENGTH ||
      hasUnsupportedAnalysisTextCharacters(nextText)
    ) {
      if (hasUnsupportedAnalysisTextCharacters(nextText)) {
        analysisStore.setAnalysisState({
          message:
            "지원하지 않는 문자가 포함되어 있어요. 영어 문장과 기본 문장부호만 입력해 주세요.",
          status: "error",
        });
      }

      return;
    }

    if (!analysisStore.isUserScopeCurrent(currentUserId)) {
      analysisStore.syncUserScope(currentUserId);
    }

    const request = analysisStore.beginAnalysisRequest(currentUserId);

    if (!request) {
      return;
    }

    analysisStore.setText(nextText);
    analysisStore.setAnalysisState({ status: "loading" });
    analysisStore.setVocabularySaveMessage(null);
    analysisStore.setVocabularySaveStates({});
    const accessToken = await getCurrentAccessToken();

    if (
      !analysisStore.isAnalysisRequestCurrent(request) ||
      !isCurrentAuthUser(request.userId)
    ) {
      return;
    }

    const nextAnalysisState = await analyzeText(nextText, {
      accessToken,
      apiBaseUrl,
      model: selectedAnalysisModel,
    });

    if (
      !analysisStore.isAnalysisRequestCurrent(request) ||
      !isCurrentAuthUser(request.userId)
    ) {
      return;
    }

    if (nextAnalysisState.status === "success") {
      analysisStore.setText("");
    }

    analysisStore.setAnalysisState(nextAnalysisState);
  };

  const handleModelChange = (value: string) => {
    if (!ANALYSIS_MODELS.some((model) => model.id === value)) {
      return;
    }

    analysisStore.setSelectedAnalysisModel(value as AnalysisModelId);
  };
  const handleTextChange = (nextText: string) => {
    if (!isAnalysisScopeCurrent) {
      analysisStore.syncUserScope(currentUserId);
    }

    analysisStore.setText(nextText);
  };

  const hasAnalysisResult = analysisState.status === "success";

  return (
    <>
      <div
        className={[
          "desktop-analysis-workspace",
          hasAnalysisResult ? "desktop-analysis-workspace--has-result" : null,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="desktop-analysis-page">
          {hasAnalysisResult ? (
            <>
              <InputSample
                count={countAnalysisTextCharacters(
                  analysisState.data.sourceText,
                )}
                maxLength={MAX_ANALYSIS_TEXT_LENGTH}
                text={analysisState.data.sourceText}
              />
              {vocabularySaveMessage ? (
                <section
                  className={[
                    "desktop-save-status",
                    vocabularySaveMessage.tone === "error"
                      ? "desktop-save-status--error"
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  role={
                    vocabularySaveMessage.tone === "error" ? "alert" : "status"
                  }
                >
                  {vocabularySaveMessage.text}
                </section>
              ) : null}
              <Suspense fallback={analysisResultFallback}>
                <AnalysisResult
                  getVocabularySuggestionState={
                    vocabularySuggestionSaver.getSuggestionState
                  }
                  onSaveVocabularySuggestion={
                    vocabularySuggestionSaver.saveSuggestion
                  }
                  result={analysisState.data}
                />
              </Suspense>
            </>
          ) : null}

          {analysisState.status === "loading" ? (
            <section className="desktop-analysis-status" role="status">
              분석 중이에요.
            </section>
          ) : null}

          {analysisState.status === "error" ||
          analysisState.status === "not_analyzable" ? (
            <section className="desktop-analysis-status" role="alert">
              {analysisState.message}
            </section>
          ) : null}
        </div>
      </div>
      <footer className="desktop-composer-wrap">
        <p className="desktop-input-disclosure">{inputDisclosure}</p>
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
    </>
  );
}

function isCurrentAuthUser(userId: string | null) {
  const authState = getAuthStateSnapshot();

  return (
    authState.status !== "loading" &&
    (authState.session?.user.id ?? null) === userId
  );
}
