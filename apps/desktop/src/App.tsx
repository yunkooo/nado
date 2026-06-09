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
import { AuthControls } from "./AuthControls";
import { ReviewFlow } from "./ReviewFlow";
import { VocabularyFlow } from "./VocabularyFlow";
import { apiBaseUrl } from "./apiConfig";
import { analyzeText } from "./analysisApi";
import { getCurrentAccessToken } from "./authClient";
import { useAnalysisPageState } from "./analysisState";
import { saveVocabularyItem } from "./vocabularyApi";
import {
  isVocabularySuggestionSaved,
  useSyncVocabularyForAuth,
  useVocabularyState,
  vocabularyStateStore,
} from "./vocabularyState";
import { useAuthState } from "./authState";

const inputDisclosure =
  "입력한 문장은 AI 분석을 위해 전송되며, 단어장에는 원문 문장을 저장하지 않습니다.";
const VOCABULARY_SAVE_NOTICE_DISMISS_MS = 2500;

type NavigationItem = {
  key: "analysis" | "review" | "vocabulary";
  label: string;
};

const navigationItems: NavigationItem[] = [
  { key: "analysis", label: "분석" },
  { key: "vocabulary", label: "단어장" },
  { key: "review", label: "복습" },
];

export function App() {
  const [activeItem, setActiveItem] =
    useState<NavigationItem["key"]>("analysis");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const closeSidebar = () => setIsSidebarOpen(false);
  const authState = useAuthState();
  const vocabularyState = useVocabularyState();
  const {
    snapshot: {
      analysisState,
      text,
      vocabularySaveMessage,
      vocabularySaveStates,
    },
    store: analysisStore,
  } = useAnalysisPageState();

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
      accessToken: await getCurrentAccessToken(),
      apiBaseUrl,
    });

    if (nextAnalysisState.status === "success") {
      analysisStore.setText("");
    }

    analysisStore.setAnalysisState(nextAnalysisState);
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
    const accessToken = await getCurrentAccessToken();

    if (!accessToken) {
      analysisStore.setVocabularySaveMessage({
        text: "로그인이 필요해요. Google 로그인 후 단어장에 저장할 수 있어요.",
        tone: "error",
      });
      return;
    }

    analysisStore.setVocabularySaveMessage(null);
    analysisStore.setVocabularySaveStates({
      [key]: "saving",
    });

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

  const selectNavigationItem = (nextItem: NavigationItem["key"]) => {
    setActiveItem(nextItem);
    closeSidebar();
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
        <nav className="desktop-nav" aria-label="주요 메뉴">
          {navigationItems.map((item) => {
            const isActive = item.key === activeItem;

            return (
              <button
                aria-current={isActive ? "page" : undefined}
                className={[
                  "desktop-nav__item",
                  isActive ? "desktop-nav__item--active" : null,
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={item.key}
                onClick={() => selectNavigationItem(item.key)}
                type="button"
              >
                {item.label}
              </button>
            );
          })}
        </nav>
        <footer className="desktop-sidebar__footer">
          <AuthControls />
        </footer>
      </aside>

      <section className="desktop-workspace" aria-label="분석 화면">
        {activeItem === "analysis" ? (
          <>
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
                      getVocabularySuggestionState={
                        getVocabularySuggestionState
                      }
                      onSaveVocabularySuggestion={
                        handleSaveVocabularySuggestion
                      }
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
          </>
        ) : null}

        {activeItem === "vocabulary" ? (
          <section className="desktop-content-workspace">
            <div className="desktop-page">
              <header className="desktop-page-header">
                <div>
                  <p className="nado-eyebrow">Vocabulary</p>
                  <h1 className="desktop-page-title">단어장</h1>
                </div>
              </header>
              <VocabularyFlow />
            </div>
          </section>
        ) : null}

        {activeItem === "review" ? (
          <section className="desktop-content-workspace">
            <div className="desktop-page">
              <header className="desktop-page-header">
                <div>
                  <p className="nado-eyebrow">Review</p>
                  <h1 className="desktop-page-title">복습</h1>
                </div>
              </header>
              <ReviewFlow />
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}

function createVocabularySuggestionKey(suggestion: VocabularySuggestion) {
  return `${suggestion.type}:${suggestion.term}:${suggestion.meaning}`;
}
