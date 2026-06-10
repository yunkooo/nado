import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const srcDir = new URL("./", import.meta.url);

const hasDesktopSource = (path: string) => existsSync(new URL(path, srcDir));

describe("desktop source structure", () => {
  it("keeps the analysis flow in its own feature folder", () => {
    expect(hasDesktopSource("analysis/AnalysisFlow.tsx")).toBe(true);
  });

  it("mirrors the web review feature folder names", () => {
    expect(hasDesktopSource("review/ReviewFlow.tsx")).toBe(true);
    expect(hasDesktopSource("review/ReviewPanels.tsx")).toBe(true);
    expect(hasDesktopSource("review/ReviewSessionView.tsx")).toBe(true);
    expect(hasDesktopSource("review/reviewSession.ts")).toBe(true);
    expect(hasDesktopSource("review/useReviewSession.ts")).toBe(true);
    expect(hasDesktopSource("ReviewFlow.tsx")).toBe(false);
    expect(hasDesktopSource("reviewHelpers.ts")).toBe(false);
  });

  it("mirrors the web vocabulary feature folder names", () => {
    expect(hasDesktopSource("vocabulary/VocabularyFlow.tsx")).toBe(true);
    expect(hasDesktopSource("vocabulary/VocabularyList.tsx")).toBe(true);
    expect(hasDesktopSource("vocabulary/VocabularyPanels.tsx")).toBe(true);
    expect(hasDesktopSource("vocabulary/useVocabularyDeleteAction.ts")).toBe(
      true,
    );
    expect(hasDesktopSource("vocabulary/vocabularyPagination.ts")).toBe(true);
    expect(hasDesktopSource("vocabulary/vocabularyViewState.ts")).toBe(true);
    expect(hasDesktopSource("VocabularyFlow.tsx")).toBe(false);
    expect(hasDesktopSource("vocabularyPagination.ts")).toBe(false);
    expect(hasDesktopSource("vocabularyViewState.ts")).toBe(false);
  });
});
