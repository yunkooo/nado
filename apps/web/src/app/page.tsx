"use client";

import { useState } from "react";
import { MAX_ANALYSIS_TEXT_LENGTH } from "@nado/shared";
import { AnalysisResult, Button, InputComposer, InputSample } from "@nado/ui";
import { analyzeText, type AnalyzeTextResult } from "./analysisApi";

const inputDisclosure =
  "입력한 문장은 AI 분석을 위해 전송되며, 단어장에는 원문 문장을 저장하지 않습니다.";

type AnalysisState = AnalyzeTextResult | { status: "idle" | "loading" };

export default function HomePage() {
  const [text, setText] = useState("");
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    status: "idle",
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const closeSidebar = () => setIsSidebarOpen(false);

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
    setAnalysisState(await analyzeText(nextText));
  };

  return (
    <main className="nado-app-shell">
      {!isSidebarOpen ? (
        <button
          aria-controls="nado-sidebar"
          aria-expanded="false"
          aria-label="사이드바 열기"
          className="nado-mobile-menu-button"
          onClick={() => setIsSidebarOpen(true)}
          type="button"
        >
          <span className="nado-mobile-menu-button__bar" />
          <span className="nado-mobile-menu-button__bar" />
          <span className="nado-mobile-menu-button__bar" />
        </button>
      ) : null}
      {isSidebarOpen ? (
        <button
          aria-label="사이드바 배경 닫기"
          className="nado-sidebar-scrim"
          onClick={closeSidebar}
          type="button"
        />
      ) : null}
      <aside
        className={["nado-sidebar", isSidebarOpen ? "nado-sidebar--open" : null]
          .filter(Boolean)
          .join(" ")}
        id="nado-sidebar"
        aria-label="주요 화면"
      >
        <div className="nado-sidebar__main">
          <header className="nado-sidebar__header">
            <div className="nado-brand">
              <span className="nado-brand__mark" aria-hidden="true">
                n
              </span>
              <strong className="nado-brand__name">nado</strong>
            </div>
            <button
              aria-label="사이드바 닫기"
              className="nado-sidebar-close"
              onClick={closeSidebar}
              type="button"
            >
              <span className="nado-sidebar-close__bar" />
              <span className="nado-sidebar-close__bar" />
            </button>
          </header>
          <nav className="nado-nav" aria-label="주요 메뉴">
            <a
              className="nado-nav__item nado-nav__item--active"
              href="/"
              onClick={closeSidebar}
            >
              분석
            </a>
            <a
              className="nado-nav__item"
              href="/vocabulary"
              onClick={closeSidebar}
            >
              단어장
            </a>
            <a className="nado-nav__item" href="/review" onClick={closeSidebar}>
              복습
            </a>
          </nav>
        </div>
        <footer className="nado-sidebar__footer">
          <Button className="nado-sidebar-login" variant="secondary">
            Google 로그인
          </Button>
        </footer>
      </aside>

      <section className="nado-workspace" aria-label="분석 화면">
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
      </section>
    </main>
  );
}
