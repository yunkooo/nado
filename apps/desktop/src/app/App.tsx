import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AnalysisFlow } from "../features/analysis/AnalysisFlow";
import { AuthControls } from "../auth/AuthControls";
import { AppDataSync } from "./AppDataSync";
import { DesktopShellView, type DesktopSurfaceKey } from "./DesktopShellView";

const StudyWorkspace = lazy(() =>
  import("./StudyWorkspace").then(({ StudyWorkspace }) => ({
    default: StudyWorkspace,
  })),
);
const studyFlowFallback = (
  <div className="desktop-analysis-status" role="status">
    화면을 불러오는 중이에요.
  </div>
);
const focusableElementSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function App() {
  const [activeItem, setActiveItem] = useState<DesktopSurfaceKey>("analysis");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const shouldRestoreMenuFocusRef = useRef(false);
  const closeSidebar = useCallback(() => {
    shouldRestoreMenuFocusRef.current = true;
    setIsSidebarOpen(false);
  }, []);

  useEffect(() => {
    if (!isSidebarOpen) {
      if (shouldRestoreMenuFocusRef.current) {
        shouldRestoreMenuFocusRef.current = false;
        menuButtonRef.current?.focus();
      }
      return;
    }

    closeButtonRef.current?.focus();
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSidebar();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const sidebar = sidebarRef.current;

      if (!sidebar) {
        return;
      }

      const focusableElements = Array.from(
        sidebar.querySelectorAll<HTMLElement>(focusableElementSelector),
      ).filter((element) => element.getClientRects().length > 0);
      const firstFocusableElement = focusableElements[0];
      const lastFocusableElement = focusableElements.at(-1);

      if (!firstFocusableElement || !lastFocusableElement) {
        event.preventDefault();
        return;
      }

      if (
        event.shiftKey &&
        (document.activeElement === firstFocusableElement ||
          !sidebar.contains(document.activeElement))
      ) {
        event.preventDefault();
        lastFocusableElement.focus();
        return;
      }

      if (
        !event.shiftKey &&
        (document.activeElement === lastFocusableElement ||
          !sidebar.contains(document.activeElement))
      ) {
        event.preventDefault();
        firstFocusableElement.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [closeSidebar, isSidebarOpen]);

  const selectNavigationItem = (nextItem: DesktopSurfaceKey) => {
    setActiveItem(nextItem);
    closeSidebar();
  };
  const workspaceLabel = {
    analysis: "분석 화면",
    review: "복습 화면",
    vocabulary: "단어장 화면",
  }[activeItem];

  return (
    <>
      <AppDataSync activeItem={activeItem} />
      <DesktopShellView
        activeItem={activeItem}
        authControls={<AuthControls />}
        closeButtonRef={closeButtonRef}
        isSidebarOpen={isSidebarOpen}
        menuButtonRef={menuButtonRef}
        onCloseSidebar={closeSidebar}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        onSelectNavigationItem={selectNavigationItem}
        sidebarRef={sidebarRef}
        workspaceLabel={workspaceLabel}
      >
        {activeItem === "analysis" ? <AnalysisFlow /> : null}

        {activeItem === "vocabulary" || activeItem === "review" ? (
          <Suspense fallback={studyFlowFallback}>
            <StudyWorkspace activeItem={activeItem} />
          </Suspense>
        ) : null}
      </DesktopShellView>
    </>
  );
}
