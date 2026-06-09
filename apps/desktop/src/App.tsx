import { useEffect, useState } from "react";
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
import { analyzeText } from "./analysisApi";
import { useAnalysisPageState } from "./analysisState";

const inputDisclosure =
  "입력한 문장은 AI 분석을 위해 전송되며, 단어장에는 원문 문장을 저장하지 않습니다.";
const desktopSaveNotice = "단어 저장은 로그인 기능 연결 후 사용할 수 있어요.";
const VOCABULARY_SAVE_NOTICE_DISMISS_MS = 2500;

const apiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  (import.meta.env.VITE_NADO_API_BASE_URL as string | undefined);

export function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const closeSidebar = () => setIsSidebarOpen(false);
  const {
    snapshot: {
      analysisState,
      text,
      vocabularySaveMessage,
      vocabularySaveStates,
    },
    store: analysisStore,
  } = useAnalysisPageState();

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

    const nextAnalysisState = await analyzeText(nextText, {
      apiBaseUrl,
    });

    if (nextAnalysisState.status === "success") {
      analysisStore.setText("");
    }

    analysisStore.setAnalysisState(nextAnalysisState);
  };

  const handleSaveVocabularySuggestion = (suggestion: VocabularySuggestion) => {
    analysisStore.setVocabularySaveStates({
      [createVocabularySuggestionKey(suggestion)]: "idle",
    });
    analysisStore.setVocabularySaveMessage({
      text: desktopSaveNotice,
      tone: "error",
    });
  };

  const getVocabularySuggestionState = (suggestion: VocabularySuggestion) => {
    return (
      vocabularySaveStates[createVocabularySuggestionKey(suggestion)] ?? "idle"
    );
  };

  return (
    <main className="desktop-shell">
      {!isSidebarOpen ? (
        <button
          aria-controls="desktop-sidebar"
          aria-expanded="false"
          aria-label="사이드바 열기"
          className="desktop-mobile-menu-button"
          onClick={() => setIsSidebarOpen(true)}
          type="button"
        >
          <span className="desktop-mobile-menu-button__bar" />
          <span className="desktop-mobile-menu-button__bar" />
          <span className="desktop-mobile-menu-button__bar" />
        </button>
      ) : null}
      {isSidebarOpen ? (
        <button
          aria-label="사이드바 배경 닫기"
          className="desktop-sidebar-scrim"
          onClick={closeSidebar}
          type="button"
        />
      ) : null}
      <aside
        className={[
          "desktop-sidebar",
          isSidebarOpen ? "desktop-sidebar--open" : null,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label="앱 정보"
        id="desktop-sidebar"
      >
        <div className="desktop-brand">
          <span className="desktop-brand__mark" aria-hidden="true">
            n
          </span>
          <strong className="desktop-brand__name">nado</strong>
          <button
            aria-label="사이드바 닫기"
            className="desktop-sidebar-close"
            onClick={closeSidebar}
            type="button"
          >
            <span className="desktop-sidebar-close__bar" />
            <span className="desktop-sidebar-close__bar" />
          </button>
        </div>
      </aside>

      <section className="desktop-workspace" aria-label="분석 화면">
        <div className="desktop-analysis-workspace">
          <div className="desktop-analysis-page">
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
                      "desktop-save-status",
                      vocabularySaveMessage.tone === "error"
                        ? "desktop-save-status--error"
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    role={
                      vocabularySaveMessage.tone === "error"
                        ? "alert"
                        : "status"
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
            onSubmit={handleSubmitAnalysis}
            onValueChange={analysisStore.setText}
            placeholder="영어 문장이나 짧은 문단을 붙여넣으세요"
            submitAriaLabel="분석 요청"
            value={text}
          />
        </footer>
      </section>
    </main>
  );
}

function createVocabularySuggestionKey(suggestion: VocabularySuggestion) {
  return `${suggestion.type}:${suggestion.term}:${suggestion.meaning}`;
}
