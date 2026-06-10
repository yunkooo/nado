import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const storyFiles = readdirSync(new URL("./", import.meta.url))
  .filter((fileName) => fileName.endsWith(".stories.tsx"))
  .sort();
const storybookConfigSource = readFileSync(
  new URL("../.storybook/main.ts", import.meta.url),
  "utf8",
);

describe("storybook source structure", () => {
  it("keeps a real structure test instead of relying on passWithNoTests", () => {
    expect(packageJson.scripts.test).not.toContain("--passWithNoTests");
  });

  it("covers the core design-system story groups", () => {
    expect(storyFiles).toEqual([
      "AnalysisInputSample.stories.tsx",
      "AnalysisPageMock.stories.tsx",
      "AnalysisReadingChunkLine.stories.tsx",
      "AnalysisResult.stories.tsx",
      "AnalysisSentenceAnalysis.stories.tsx",
      "Button.stories.tsx",
      "Chip.stories.tsx",
      "Foundations.stories.tsx",
      "InputComposer.stories.tsx",
      "ReviewCard.stories.tsx",
      "VocabularyList.stories.tsx",
      "VocabularySuggestionList.stories.tsx",
    ]);
  });

  it("loads workspace packages from source while editing stories", () => {
    expect(storybookConfigSource).toContain(
      "../../../packages/ui/src/index.ts",
    );
    expect(storybookConfigSource).toContain(
      "../../../packages/shared/src/index.ts",
    );
  });
});
