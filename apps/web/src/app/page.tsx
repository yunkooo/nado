"use client";

import { useState } from "react";
import { MAX_ANALYSIS_TEXT_LENGTH } from "@nado/shared";
import { AnalysisResult, InputComposer, InputSample } from "@nado/ui";
import { AppShell } from "./AppShell";
import { analyzeText, type AnalyzeTextResult } from "./analysisApi";
import { getCurrentAccessToken } from "./authClient";

const inputDisclosure =
  "입력한 문장은 AI 분석을 위해 전송되며, 단어장에는 원문 문장을 저장하지 않습니다.";

type AnalysisState = AnalyzeTextResult | { status: "idle" | "loading" };

export default function HomePage() {
  const [text, setText] = useState("");
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    status: "idle",
  });

  const handleSubmitAnalysis = async () => {
    const nextText = text.trim();

    if (
      analysisState.status === "loading" ||
      nextText.length === 0 ||
      text.length > MAX_ANALYSIS_TEXT_LENGTH
    ) {
      return;
    }

    setAnalysisState({ status: "loading" });
    setAnalysisState(
      await analyzeText(nextText, {
        accessToken: await getCurrentAccessToken(),
      }),
    );
  };

  return (
    <AppShell activeItem="analysis" workspaceLabel="분석 화면">
      <section className="nado-analysis-workspace">
        <div className="nado-analysis-page">
          {analysisState.status === "success" ? (
            <>
              <InputSample
                count={analysisState.data.sourceText.length}
                maxLength={MAX_ANALYSIS_TEXT_LENGTH}
                text={analysisState.data.sourceText}
              />
              <AnalysisResult result={analysisState.data} />
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
