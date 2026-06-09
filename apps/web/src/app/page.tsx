"use client";

import { useState } from "react";
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
  type VocabularySuggestionSaveState,
} from "@nado/ui";
import { AppShell } from "./AppShell";
import { analyzeText, type AnalyzeTextResult } from "./analysisApi";
import { getCurrentAccessToken } from "./authClient";
import { saveVocabularyItem } from "./vocabularyApi";

const inputDisclosure =
  "입력한 문장은 AI 분석을 위해 전송되며, 단어장에는 원문 문장을 저장하지 않습니다.";

type AnalysisState = AnalyzeTextResult | { status: "idle" | "loading" };
type VocabularySaveMessage = {
  tone: "error" | "success";
  text: string;
};

export default function HomePage() {
  const [text, setText] = useState("");
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    status: "idle",
  });
  const [vocabularySaveStates, setVocabularySaveStates] = useState<
    Record<string, VocabularySuggestionSaveState>
  >({});
  const [vocabularySaveMessage, setVocabularySaveMessage] =
    useState<VocabularySaveMessage | null>(null);

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

    setAnalysisState({ status: "loading" });
    setVocabularySaveMessage(null);
    setVocabularySaveStates({});
    setAnalysisState(
      await analyzeText(nextText, {
        accessToken: await getCurrentAccessToken(),
      }),
    );
  };

  const handleSaveVocabularySuggestion = async (
    suggestion: VocabularySuggestion,
  ) => {
    const key = createVocabularySuggestionKey(suggestion);
    const currentState = vocabularySaveStates[key] ?? "idle";

    if (currentState !== "idle") {
      return;
    }

    const accessToken = await getCurrentAccessToken();

    if (!accessToken) {
      setVocabularySaveMessage({
        text: "Google 로그인 후 단어장을 저장할 수 있어요.",
        tone: "error",
      });
      return;
    }

    setVocabularySaveMessage(null);
    setVocabularySaveStates((currentStates) => ({
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
      setVocabularySaveStates((currentStates) => ({
        ...currentStates,
        [key]: "saved",
      }));
      setVocabularySaveMessage({
        text: `${result.data.term}을 단어장에 저장했어요.`,
        tone: "success",
      });
      return;
    }

    setVocabularySaveStates((currentStates) => {
      const nextStates = { ...currentStates };
      delete nextStates[key];
      return nextStates;
    });
    setVocabularySaveMessage({
      text: result.message,
      tone: "error",
    });
  };

  const getVocabularySuggestionState = (suggestion: VocabularySuggestion) =>
    vocabularySaveStates[createVocabularySuggestionKey(suggestion)] ?? "idle";

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
          onValueChange={setText}
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
