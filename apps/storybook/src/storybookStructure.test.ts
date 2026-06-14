import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const toStoryFiles = (path: string) =>
  readdirSync(new URL(path, import.meta.url))
    .filter((fileName) => fileName.endsWith(".stories.tsx"))
    .sort();

const readStorySource = (fileName: string) =>
  readFileSync(new URL(`./${fileName}`, import.meta.url), "utf8");
const readUiStorySource = (fileName: string) =>
  readFileSync(
    new URL(`../../../packages/ui/src/${fileName}`, import.meta.url),
    "utf8",
  );

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const prTemplateSource = readFileSync(
  new URL("../../../.github/pull_request_template.md", import.meta.url),
  "utf8",
);
const prWorkflowSource = readFileSync(
  new URL("../../../docs/workflow/pr-workflow.md", import.meta.url),
  "utf8",
);
const readmeSource = readFileSync(
  new URL("../README.md", import.meta.url),
  "utf8",
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

  it("documents the selected story verification approach", () => {
    expect(readmeSource).toContain(
      "선택: source contract test + Storybook build",
    );
    expect(readmeSource).toContain("Vitest addon");
    expect(readmeSource).toContain("portable stories");
    expect(readmeSource).toContain("pnpm --filter @nado/storybook build");
  });

  it("keeps core interaction states testable through story exports", () => {
    const vocabularySuggestionListSource = readUiStorySource(
      "VocabularySuggestionList.stories.tsx",
    );
    const analysisResultSource = readUiStorySource(
      "AnalysisResult.stories.tsx",
    );
    const webSurfaceSource = readStorySource("WebSurface.stories.tsx");
    const desktopSurfaceSource = readStorySource("DesktopSurface.stories.tsx");

    expect(vocabularySuggestionListSource).toContain("export const Idle");
    expect(vocabularySuggestionListSource).toContain("export const Saving");
    expect(vocabularySuggestionListSource).toContain(
      "export const SavedDisabled",
    );
    expect(vocabularySuggestionListSource).toContain(
      'getSuggestionState: () => "idle"',
    );
    expect(vocabularySuggestionListSource).toContain(
      'getSuggestionState: () => "saving"',
    );
    expect(vocabularySuggestionListSource).toContain(
      'getSuggestionState: () => "saved"',
    );

    expect(analysisResultSource).toContain("export const WordPopoverOpen");
    expect(analysisResultSource).toContain('activeVocabularyKey: "framework"');
    expect(analysisResultSource).toContain("export const NarrowTapOpen");
    expect(webSurfaceSource).toContain("export const NarrowSidebarOpen");
    expect(desktopSurfaceSource).toContain("export const SidebarOpen");
  });

  it("connects Storybook verification to the PR checklist and workflow docs", () => {
    expect(prTemplateSource).toContain("UI/Storybook 변경 시");
    expect(prTemplateSource).toContain("pnpm --filter @nado/storybook test");
    expect(prTemplateSource).toContain("pnpm --filter @nado/storybook build");
    expect(prWorkflowSource).toContain("Storybook 검증 기준");
    expect(prWorkflowSource).toContain(
      "CI에는 아직 Storybook build를 자동 추가하지 않는다",
    );
    expect(prWorkflowSource).toContain("pnpm --filter @nado/ui test");
    expect(prWorkflowSource).toContain("pnpm --filter @nado/mobile test");
    expect(readmeSource).toContain("PR checklist");
  });
});
