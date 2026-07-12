import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const srcDir = new URL("../", import.meta.url);

const hasDesktopSource = (path: string) => existsSync(new URL(path, srcDir));

describe("desktop source structure", () => {
  it("keeps app shell files in the app folder", () => {
    expect(hasDesktopSource("app/App.tsx")).toBe(true);
    expect(hasDesktopSource("app/App.test.tsx")).toBe(true);
    expect(hasDesktopSource("app/AppDataSync.tsx")).toBe(true);
    expect(hasDesktopSource("app/AppDataSync.test.tsx")).toBe(true);
    expect(hasDesktopSource("app/DesktopShellView.tsx")).toBe(true);
    expect(hasDesktopSource("app/DesktopShellView.test.tsx")).toBe(true);
    expect(hasDesktopSource("App.tsx")).toBe(false);
    expect(hasDesktopSource("App.test.tsx")).toBe(false);
  });

  it("groups API clients in the api folder", () => {
    expect(hasDesktopSource("api/apiConfig.ts")).toBe(true);
    expect(hasDesktopSource("api/apiFetch.ts")).toBe(true);
    expect(hasDesktopSource("api/analysisApi.ts")).toBe(true);
    expect(hasDesktopSource("api/vocabularyApi.ts")).toBe(true);
    expect(hasDesktopSource("apiConfig.ts")).toBe(false);
    expect(hasDesktopSource("analysisApi.ts")).toBe(false);
    expect(hasDesktopSource("vocabularyApi.ts")).toBe(false);
  });

  it("groups desktop authentication files in the auth folder", () => {
    expect(hasDesktopSource("auth/AuthControls.tsx")).toBe(true);
    expect(hasDesktopSource("auth/authActions.ts")).toBe(true);
    expect(hasDesktopSource("auth/authClient.ts")).toBe(true);
    expect(hasDesktopSource("auth/authState.ts")).toBe(true);
    expect(hasDesktopSource("auth/desktopAuthDeepLink.ts")).toBe(true);
    expect(hasDesktopSource("auth/desktopAuthDeepLink.test.tsx")).toBe(true);
    expect(hasDesktopSource("AuthControls.tsx")).toBe(false);
    expect(hasDesktopSource("authClient.ts")).toBe(false);
  });

  it("keeps the analysis flow in its own feature folder", () => {
    expect(hasDesktopSource("features/analysis/AnalysisFlow.tsx")).toBe(true);
    expect(hasDesktopSource("features/analysis/analysisState.ts")).toBe(true);
    expect(hasDesktopSource("analysis/AnalysisFlow.tsx")).toBe(false);
  });

  it("mirrors the web review feature folder names", () => {
    expect(hasDesktopSource("features/review/ReviewFlow.tsx")).toBe(true);
    expect(hasDesktopSource("features/review/ReviewPanels.tsx")).toBe(true);
    expect(hasDesktopSource("features/review/ReviewSessionView.tsx")).toBe(
      false,
    );
    expect(hasDesktopSource("features/review/reviewSession.ts")).toBe(false);
    expect(hasDesktopSource("features/review/useReviewSession.ts")).toBe(true);
    expect(hasDesktopSource("features/review/useReviewSession.test.ts")).toBe(
      true,
    );
    expect(hasDesktopSource("review/ReviewFlow.tsx")).toBe(false);
    expect(hasDesktopSource("ReviewFlow.tsx")).toBe(false);
    expect(hasDesktopSource("reviewHelpers.ts")).toBe(false);
  });

  it("mirrors the web vocabulary feature folder names", () => {
    expect(hasDesktopSource("features/vocabulary/VocabularyFlow.tsx")).toBe(
      true,
    );
    expect(hasDesktopSource("features/vocabulary/VocabularyList.tsx")).toBe(
      true,
    );
    expect(hasDesktopSource("features/vocabulary/VocabularyPanels.tsx")).toBe(
      true,
    );
    expect(
      hasDesktopSource("features/vocabulary/useVocabularyDeleteAction.ts"),
    ).toBe(true);
    expect(
      hasDesktopSource("features/vocabulary/vocabularyPagination.ts"),
    ).toBe(false);
    expect(hasDesktopSource("features/vocabulary/vocabularyState.ts")).toBe(
      true,
    );
    expect(hasDesktopSource("features/vocabulary/vocabularyRealtime.ts")).toBe(
      true,
    );
    expect(
      hasDesktopSource("features/vocabulary/vocabularyRealtime.test.ts"),
    ).toBe(true);
    expect(hasDesktopSource("features/vocabulary/vocabularyViewState.ts")).toBe(
      true,
    );
    expect(hasDesktopSource("vocabulary/VocabularyFlow.tsx")).toBe(false);
    expect(hasDesktopSource("VocabularyFlow.tsx")).toBe(false);
    expect(hasDesktopSource("vocabularyState.ts")).toBe(false);
    expect(hasDesktopSource("vocabularyPagination.ts")).toBe(false);
    expect(hasDesktopSource("vocabularyViewState.ts")).toBe(false);
  });

  it("keeps global styles and config tests in dedicated folders", () => {
    expect(hasDesktopSource("styles/styles.css")).toBe(true);
    expect(hasDesktopSource("test/desktopStructure.test.ts")).toBe(true);
    expect(hasDesktopSource("test/tauriConfig.test.ts")).toBe(true);
    expect(hasDesktopSource("test/viteConfig.test.ts")).toBe(true);
    expect(hasDesktopSource("styles.css")).toBe(false);
    expect(hasDesktopSource("tauriConfig.test.ts")).toBe(false);
    expect(hasDesktopSource("viteConfig.test.ts")).toBe(false);
  });
});
