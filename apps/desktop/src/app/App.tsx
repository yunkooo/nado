import { useEffect, useRef, useState } from "react";
import { AnalysisFlow } from "../features/analysis/AnalysisFlow";
import { AuthControls } from "../auth/AuthControls";
import { ReviewFlow } from "../features/review/ReviewFlow";
import { VocabularyFlow } from "../features/vocabulary/VocabularyFlow";
import {
  useRefreshVocabularyForActiveStudySurface,
  useSyncVocabularyForAuth,
} from "../features/vocabulary/vocabularyState";
import { useAuthState } from "../auth/authState";

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
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const shouldRestoreMenuFocusRef = useRef(false);
  const closeSidebar = () => {
    shouldRestoreMenuFocusRef.current = true;
    setIsSidebarOpen(false);
  };
  const authState = useAuthState();
  const isStudySurfaceActive =
    activeItem === "vocabulary" || activeItem === "review";

  useSyncVocabularyForAuth(authState);
  useRefreshVocabularyForActiveStudySurface(
    authState,
    isStudySurfaceActive,
    activeItem,
  );

  useEffect(() => {
    if (!isSidebarOpen) {
      if (shouldRestoreMenuFocusRef.current) {
        shouldRestoreMenuFocusRef.current = false;
        menuButtonRef.current?.focus();
      }
      return;
    }

    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSidebarOpen]);

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
          ref={menuButtonRef}
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
            ref={closeButtonRef}
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
        {activeItem === "analysis" ? <AnalysisFlow /> : null}

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
