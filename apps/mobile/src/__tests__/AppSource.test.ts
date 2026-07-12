import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MAX_ANALYSIS_TEXT_LENGTH } from "@nado/shared/analysis-input";
import {
  ANALYSIS_INPUT_ACCESSIBILITY_LABEL,
  getAnalysisComposerState,
  getMobileTabs,
} from "../features/analysis/analysisScreen";
import { getMobileWordPopoverPosition } from "../features/analysis/wordPopoverPlacement";

const appSource = readFileSync(
  new URL("../../App.tsx", import.meta.url),
  "utf8",
);
const designDemoSource = readFileSync(
  new URL("../../App.design-demo.tsx", import.meta.url),
  "utf8",
);
const analysisPanelSource = readFileSync(
  new URL("../screens/AnalysisResultPanel.tsx", import.meta.url),
  "utf8",
);

describe("mobile application public contracts", () => {
  it("keeps the production navigation free of the design-only tab", () => {
    expect(
      getMobileTabs({ showDesignDemo: false }).map((tab) => tab.key),
    ).toEqual(["analysis", "vocabulary", "review"]);
    expect(
      getMobileTabs({ showDesignDemo: true }).map((tab) => tab.key),
    ).toEqual(["analysis", "vocabulary", "review", "designDemo"]);
  });

  it("keeps production and design-demo entries while delegating stable app boundaries", () => {
    expect(appSource).toContain("useMobileAnalysisController");
    expect(appSource).toContain("<MobileAppShell");
    expect(appSource).not.toContain("AsyncStorage");
    expect(appSource).not.toContain("SafeAreaProvider");
    expect(designDemoSource).toContain("<NadoApp designDemoContent=");
  });

  it("delegates sentence and vocabulary rendering from the result panel", () => {
    expect(analysisPanelSource).toContain("<MobileSentenceAnalysisCard");
    expect(analysisPanelSource).toContain("<MobileVocabularySuggestionList");
    expect(analysisPanelSource).not.toContain(
      "function MobileSentenceAnalysisCard",
    );
    expect(analysisPanelSource).not.toContain(
      "function renderMobileVocabularyAwareText",
    );
  });

  it("exposes an accessible and validated analysis composer contract", () => {
    expect(ANALYSIS_INPUT_ACCESSIBILITY_LABEL).toBe("분석할 영어 문장");
    expect(getAnalysisComposerState("")).toMatchObject({
      countLabel: `0 / ${MAX_ANALYSIS_TEXT_LENGTH}`,
      isSubmitDisabled: true,
    });
    expect(getAnalysisComposerState("Could you help me?")).toMatchObject({
      isSubmitDisabled: false,
    });
  });

  it("keeps the word popover inside the current viewport", () => {
    const position = getMobileWordPopoverPosition({
      popoverSize: { height: 180, width: 320 },
      triggerRect: { height: 28, width: 72, x: 326, y: 360 },
      viewportSize: { height: 390, width: 720 },
    });

    expect(position.left).toBeGreaterThanOrEqual(12);
    expect(position.left + position.width).toBeLessThanOrEqual(708);
    expect(position.top + position.height).toBeLessThanOrEqual(378);
  });
});
