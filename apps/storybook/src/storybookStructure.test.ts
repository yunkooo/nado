import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const toStoryFiles = (path: string) =>
  readdirSync(new URL(path, import.meta.url))
    .filter((fileName) => fileName.endsWith(".stories.tsx"))
    .sort();

const readStorySource = (fileName: string) =>
  readFileSync(new URL(`./${fileName}`, import.meta.url), "utf8");

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const appStoryFiles = toStoryFiles("./");
const uiStoryFiles = toStoryFiles("../../../packages/ui/src/");
const storybookConfigSource = readFileSync(
  new URL("../.storybook/main.ts", import.meta.url),
  "utf8",
);

describe("storybook source structure", () => {
  it("keeps a real structure test instead of relying on passWithNoTests", () => {
    expect(packageJson.scripts.test).not.toContain("--passWithNoTests");
  });

  it("keeps app-level stories in the Storybook app", () => {
    expect(appStoryFiles).toEqual([
      "AnalysisPageMock.stories.tsx",
      "DesktopSurface.stories.tsx",
      "Foundations.stories.tsx",
      "WebSurface.stories.tsx",
    ]);
  });

  it("co-locates shared UI stories with the UI package source", () => {
    expect(uiStoryFiles).toEqual([
      "AnalysisInputSample.stories.tsx",
      "AnalysisReadingChunkLine.stories.tsx",
      "AnalysisResult.stories.tsx",
      "AnalysisSentenceAnalysis.stories.tsx",
      "Button.stories.tsx",
      "Chip.stories.tsx",
      "InputComposer.stories.tsx",
      "ReviewCard.stories.tsx",
      "VocabularyList.stories.tsx",
      "VocabularySuggestionList.stories.tsx",
    ]);
  });

  it("loads workspace packages from source while editing stories", () => {
    expect(storybookConfigSource).toContain(
      "../../../packages/ui/src/**/*.stories.@(ts|tsx)",
    );
    expect(storybookConfigSource).toContain(
      "../../../packages/ui/src/index.ts",
    );
    expect(storybookConfigSource).toContain(
      "../../../packages/tokens/src/index.ts",
    );
    expect(storybookConfigSource).toContain(
      "../../../packages/tokens/src/reactNative.ts",
    );
    expect(storybookConfigSource).toContain(
      "../../../packages/shared/src/index.ts",
    );
  });

  it("keeps app surface stories on mock data without app API or auth imports", () => {
    const appSurfaceSource = [
      readStorySource("DesktopSurface.stories.tsx"),
      readStorySource("WebSurface.stories.tsx"),
    ].join("\n");

    expect(appSurfaceSource).not.toContain("/api/");
    expect(appSurfaceSource).not.toContain("authState");
    expect(appSurfaceSource).not.toContain("useAuthState");
    expect(appSurfaceSource).not.toContain("useAnalysisSubmission");
    expect(appSurfaceSource).toContain("Narrow");
    expect(appSurfaceSource).toContain("SidebarOpen");
  });

  it("uses viewport globals for narrow sidebar stories", () => {
    const appSurfaceSource = [
      readStorySource("DesktopSurface.stories.tsx"),
      readStorySource("WebSurface.stories.tsx"),
    ].join("\n");

    expect(appSurfaceSource).toContain("globals:");
    expect(appSurfaceSource).toContain('value: "mobile1"');
    expect(appSurfaceSource).not.toContain("defaultViewport");
  });

  it("keeps the desktop review story aligned with desktop review CSS", () => {
    const desktopSurfaceSource = readStorySource("DesktopSurface.stories.tsx");

    expect(desktopSurfaceSource).not.toContain("ReviewCard,");
    expect(desktopSurfaceSource).toContain(
      "nado-review-card__answer--revealed",
    );
  });
});
