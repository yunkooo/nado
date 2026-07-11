import { useEffect, useRef } from "react";
import {
  ANALYSIS_MODELS,
  MAX_ANALYSIS_TEXT_LENGTH,
  countAnalysisTextCharacters,
  hasUnsupportedAnalysisTextCharacters,
  isCurrentUserScopedRequest,
  normalizeAnalysisText,
  shouldApplyUserScopedMutation,
  type AnalysisModelId,
} from "@nado/shared";
import {
  AnalysisResult,
  InputComposer,
  InputSample,
  type VocabularySuggestion,
  type VocabularySuggestionSaveState,
} from "@nado/ui";
import { apiBaseUrl } from "../../api/apiConfig";
import { analyzeText } from "../../api/analysisApi";
import { useAnalysisPageState } from "./analysisState";
import { getCurrentAccessToken } from "../../auth/authClient";
import { useAuthState } from "../../auth/authState";
import { saveVocabularyItem } from "../../api/vocabularyApi";
import {
  isVocabularySuggestionSaved,
  useVocabularyState,
  vocabularyStateStore,
} from "../vocabulary/vocabularyState";

const inputDisclosure = "입력문은 분석에만 사용되며 저장되지 않습니다.";
const VOCABULARY_SAVE_NOTICE_DISMISS_MS = 2500;

export function AnalysisFlow() {
  const authState = useAuthState();
  const analysisRequestIdRef = useRef(0);
  const currentUserIdRef = useRef(authState.session?.user.id ?? null);
  const vocabularyState = useVocabularyState();
  const { snapshot, store: analysisStore } = useAnalysisPageState();

  currentUserIdRef.current = authState.session?.user.id ?? null;
  const isAnalysisScopeCurrent =
    authState.status !== "loading" &&
    snapshot.ownerUserId === currentUserIdRef.current;
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

    analysisStore.syncUserScope(authState.session?.user.id ?? null);
    analysisStore.setVocabularySaveMessage(null);
    analysisStore.setVocabularySaveStates({});
  }, [analysisStore, authState.session?.user.id, authState.status]);

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

    analysisStore.setText(nextText);
    analysisStore.setAnalysisState({ status: "loading" });
    analysisStore.setVocabularySaveMessage(null);
    analysisStore.setVocabularySaveStates({});
    const requestId = analysisRequestIdRef.current + 1;
    const requestUserId = authState.session?.user.id ?? null;
    analysisRequestIdRef.current = requestId;
    const accessToken = await getCurrentAccessToken();

    if (!isCurrentAnalysisRequest(requestId, requestUserId)) {
      return;
    }

    const nextAnalysisState = await analyzeText(nextText, {
      accessToken,
      apiBaseUrl,
      model: selectedAnalysisModel,
    });

    if (!isCurrentAnalysisRequest(requestId, requestUserId)) {
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
      analysisStore.syncUserScope(currentUserIdRef.current);
    }

    analysisStore.setText(nextText);
  };

  const handleSaveVocabularySuggestion = (suggestion: VocabularySuggestion) => {
    const key = createVocabularySuggestionKey(suggestion);
    const currentState = getVocabularySuggestionState(suggestion);

    if (currentState !== "idle") {
      return;
    }

    void saveVocabularySuggestion(key, suggestion);
  };

  const saveVocabularySuggestion = async (
    key: string,
    suggestion: VocabularySuggestion,
  ) => {
    const requestUserId = authState.session?.user.id;

    if (!requestUserId) {
      analysisStore.setVocabularySaveMessage({
        text: "로그인이 필요해요. Google 로그인 후 단어장에 저장할 수 있어요.",
        tone: "error",
      });
      return;
    }

    const accessToken = await getCurrentAccessToken();

    if (
      !shouldApplyUserScopedMutation(requestUserId, currentUserIdRef.current)
    ) {
      return;
    }

    if (!accessToken) {
      analysisStore.setVocabularySaveMessage({
        text: "로그인이 필요해요. Google 로그인 후 단어장에 저장할 수 있어요.",
        tone: "error",
      });
      return;
    }

    analysisStore.setVocabularySaveMessage(null);
    analysisStore.setVocabularySaveStates((currentStates) =>
      markVocabularySuggestionSaving(currentStates, key),
    );

    const result = await saveVocabularyItem(
      {
        meaning: suggestion.meaning,
        note: suggestion.note,
        term: suggestion.term,
        type: suggestion.type,
      },
      accessToken,
    );

    if (
      !shouldApplyUserScopedMutation(requestUserId, currentUserIdRef.current)
    ) {
      return;
    }

    if (result.status === "success") {
      vocabularyStateStore.upsertItem(result.data);
      analysisStore.setVocabularySaveStates((currentStates) => {
        const nextStates = { ...currentStates };
        delete nextStates[key];
        return nextStates;
      });
      analysisStore.setVocabularySaveMessage({
        text: "단어장에 저장했어요.",
        tone: "success",
      });
      return;
    }

    analysisStore.setVocabularySaveStates((currentStates) => {
      const nextStates = { ...currentStates };
      delete nextStates[key];
      return nextStates;
    });
    analysisStore.setVocabularySaveMessage({
      text: result.message,
      tone: "error",
    });
  };

  const getVocabularySuggestionState = (suggestion: VocabularySuggestion) => {
    const pendingState =
      vocabularySaveStates[createVocabularySuggestionKey(suggestion)];

    if (pendingState === "saving") {
      return "saving";
    }

    if (isVocabularySuggestionSaved(vocabularyState.items, suggestion)) {
      return "saved";
    }

    return "idle";
  };

  function isCurrentAnalysisRequest(
    requestId: number,
    requestUserId: string | null,
  ) {
    return isCurrentUserScopedRequest(
      requestUserId,
      currentUserIdRef.current,
      requestId,
      analysisRequestIdRef.current,
    );
  }

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
              <AnalysisResult
                getVocabularySuggestionState={getVocabularySuggestionState}
                onSaveVocabularySuggestion={handleSaveVocabularySuggestion}
                result={analysisState.data}
              />
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

export function markVocabularySuggestionSaving(
  currentStates: Record<string, VocabularySuggestionSaveState>,
  key: string,
) {
  return {
    ...currentStates,
    [key]: "saving" as const,
  };
}

function createVocabularySuggestionKey(suggestion: VocabularySuggestion) {
  return `${suggestion.type}:${suggestion.term}:${suggestion.meaning}`;
}
