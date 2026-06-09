"use client";

import { useEffect } from "react";
import {
  MAX_ANALYSIS_TEXT_LENGTH,
  countAnalysisTextCharacters,
  hasUnsupportedAnalysisTextCharacters,
  normalizeAnalysisText,
} from "@nado/shared";
import {
  AnalysisResult,
  InputComposer,
  InputSample,
  type VocabularySuggestion,
} from "@nado/ui";
import { AppShell } from "./AppShell";
import { analyzeText } from "./analysisApi";
import { useAnalysisPageState } from "./analysisState";
import { useAuthState } from "./authState";
import { getCurrentAccessToken } from "./authClient";
import { saveVocabularyItem } from "./vocabularyApi";
import {
  isVocabularySuggestionSaved,
  useSyncVocabularyForAuth,
  useVocabularyState,
  vocabularyStateStore,
} from "./vocabularyState";
import {
  createVocabularyLoginRequiredNotice,
  createVocabularySaveSuccessNotice,
} from "./vocabularySaveNotice";

const inputDisclosure =
  "입력한 문장은 AI 분석을 위해 전송되며, 단어장에는 원문 문장을 저장하지 않습니다.";
const VOCABULARY_SAVE_NOTICE_DISMISS_MS = 2500;

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
  const authState = useAuthState();
  const vocabularyState = useVocabularyState();

  useSyncVocabularyForAuth(authState);

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
      return;
    }

    analysisStore.setAnalysisState({ status: "loading" });
    analysisStore.setVocabularySaveMessage(null);
    analysisStore.setVocabularySaveStates({});
    const nextAnalysisState = await analyzeText(nextText, {
      accessToken: await getCurrentAccessToken(),
    });

    if (nextAnalysisState.status === "success") {
      analysisStore.setText("");
    }

    analysisStore.setAnalysisState(nextAnalysisState);
  };

  const handleSaveVocabularySuggestion = async (
    suggestion: VocabularySuggestion,
  ) => {
    const key = createVocabularySuggestionKey(suggestion);
    const currentState = getVocabularySuggestionState(suggestion);

    if (currentState !== "idle") {
      return;
    }

    const accessToken = await getCurrentAccessToken();

    if (!accessToken) {
      analysisStore.setVocabularySaveMessage(
        createVocabularyLoginRequiredNotice(),
      );
      return;
    }

    analysisStore.setVocabularySaveMessage(null);
    analysisStore.setVocabularySaveStates((currentStates) => ({
      ...currentStates,
      [key]: "saving",
    }));

    const result = await saveVocabularyItem(
      {
        meaning: suggestion.meaning,
        note: suggestion.note,
        term: suggestion.term,
        type: suggestion.type,
      },
      accessToken,
    );

    if (result.status === "success") {
      vocabularyStateStore.upsertItem(result.data);
      analysisStore.setVocabularySaveStates((currentStates) => {
        const nextStates = { ...currentStates };
        delete nextStates[key];
        return nextStates;
      });
      analysisStore.setVocabularySaveMessage(
        createVocabularySaveSuccessNotice(result.data.term),
      );
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
              {vocabularySaveMessage ? (
                <section
                  className={[
                    "nado-save-status",
                    vocabularySaveMessage.tone === "error"
                      ? "nado-save-status--error"
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

function createVocabularySuggestionKey(suggestion: VocabularySuggestion) {
  return `${suggestion.type}:${suggestion.term}:${suggestion.meaning}`;
}
