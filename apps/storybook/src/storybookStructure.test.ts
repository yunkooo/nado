import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const toStoryFiles = (path: string) =>
  readdirSync(new URL(path, import.meta.url))
    .filter((fileName) => fileName.endsWith(".stories.tsx"))
    .sort();

const readStorySource = (fileName: string) =>
  readFileSync(new URL(`./${fileName}`, import.meta.url), "utf8");
const readUiStorySource = (fileName: string) =>
  readFileSync(
    new URL(`../../../packages/ui-web/src/${fileName}`, import.meta.url),
    "utf8",
  );
const readOptionalSource = (path: string) => {
  const sourceUrl = new URL(path, import.meta.url);

  return existsSync(sourceUrl) ? readFileSync(sourceUrl, "utf8") : "";
};
const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const storyExportPattern = (exportName: string) =>
  new RegExp(`export\\s+const\\s+${escapeRegExp(exportName)}\\s*(?::|=)`);
const storyExportBlockPattern = (exportName: string) =>
  new RegExp(
    `export\\s+const\\s+${escapeRegExp(exportName)}\\s*(?::|=)[\\s\\S]*?(?=\\nexport\\s+const\\s+|$)`,
  );
const getStoryExportBlock = (source: string, exportName: string) => {
  const match = storyExportBlockPattern(exportName).exec(source);

  if (!match) {
    throw new Error(`Missing story export: ${exportName}`);
  }

  return match[0];
};
const expectStoryExport = (source: string, exportName: string) => {
  expect(source).toMatch(storyExportPattern(exportName));
};
const expectStoryExportBlockToContain = (
  source: string,
  exportName: string,
  expected: string,
) => {
  expect(getStoryExportBlock(source, exportName)).toContain(expected);
};
const expectSharedImport = (source: string, exportName: string) => {
  expect(source).toMatch(
    new RegExp(
      `import\\s*{[^}]*\\b${escapeRegExp(exportName)}\\b[^}]*}\\s*from\\s*"@nado/shared"`,
    ),
  );
};

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
const tokenParityDemoSource = readOptionalSource(
  "../../../docs/design-system/token-parity-demo.md",
);
const readmeSource = readFileSync(
  new URL("../README.md", import.meta.url),
  "utf8",
);
const appStoryFiles = toStoryFiles("./");
const uiStoryFiles = toStoryFiles("../../../packages/ui-web/src/");
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

  it("co-locates shared UI stories with the Web implementation package source", () => {
    expect(uiStoryFiles).toEqual([
      "AnalysisInputSample.stories.tsx",
      "AnalysisReadingChunkLine.stories.tsx",
      "AnalysisResult.stories.tsx",
      "AnalysisSentenceAnalysis.stories.tsx",
      "Badge.stories.tsx",
      "Button.stories.tsx",
      "Card.stories.tsx",
      "Chip.stories.tsx",
      "InputComposer.stories.tsx",
      "ReviewCard.stories.tsx",
      "Stack.stories.tsx",
      "Text.stories.tsx",
      "VocabularyList.stories.tsx",
      "VocabularySuggestionList.stories.tsx",
    ]);
  });

  it("loads workspace packages from source while editing stories", () => {
    expect(storybookConfigSource).toContain(
      "../../../packages/ui-web/src/**/*.stories.@(ts|tsx)",
    );
    expect(storybookConfigSource).toContain(
      "../../../packages/ui/src/index.ts",
    );
    expect(storybookConfigSource).toContain(
      "../../../packages/ui-web/src/index.ts",
    );
    expect(storybookConfigSource).toContain("@nado\\/ui-web");
    expect(storybookConfigSource).toContain("@nado\\/ui\\/web\\/styles.css");
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
    const desktopSurfaceSource = readStorySource("DesktopSurface.stories.tsx");
    const webSurfaceSource = readStorySource("WebSurface.stories.tsx");
    const appSurfaceSource = [desktopSurfaceSource, webSurfaceSource].join(
      "\n",
    );

    expect(appSurfaceSource).not.toContain("/api/");
    expect(appSurfaceSource).not.toContain("authState");
    expect(appSurfaceSource).not.toContain("useAuthState");
    expect(appSurfaceSource).not.toContain("useAnalysisSubmission");
    expectStoryExport(webSurfaceSource, "NarrowSidebarOpen");
    expectStoryExport(desktopSurfaceSource, "SidebarOpen");
  });

  it("documents the selected story verification approach", () => {
    expect(readmeSource).toContain(
      "선택: source contract test + Storybook build",
    );
    expect(readmeSource).toContain("Vitest addon");
    expect(readmeSource).toContain("portable stories");
    expect(readmeSource).toContain("pnpm --filter @nado/storybook build");
  });

  it("matches story export identifiers exactly", () => {
    expect(
      storyExportPattern("Idle").test("export const Idle: Story = {}"),
    ).toBe(true);
    expect(
      storyExportPattern("Idle").test("export const IdleDisabled: Story = {}"),
    ).toBe(false);
    expect(
      storyExportPattern("WordPopoverOpen").test(
        "export const WordPopoverOpenLegacy = {}",
      ),
    ).toBe(false);
  });

  it("scopes story arg checks to the selected export block", () => {
    const source = `
export const WordPopoverOpen: Story = {
  args: {
    result: analysisMock,
  },
};

export const OtherStory: Story = {
  args: {
    activeVocabularyKey: "framework",
    getSuggestionState: () => "saved",
  },
};
`;

    expect(getStoryExportBlock(source, "WordPopoverOpen")).not.toContain(
      'activeVocabularyKey: "framework"',
    );
    expect(getStoryExportBlock(source, "OtherStory")).toContain(
      'activeVocabularyKey: "framework"',
    );
    expect(getStoryExportBlock(source, "WordPopoverOpen")).not.toContain(
      'getSuggestionState: () => "saved"',
    );
    expect(getStoryExportBlock(source, "OtherStory")).toContain(
      'getSuggestionState: () => "saved"',
    );
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

    expectStoryExport(vocabularySuggestionListSource, "Idle");
    expectStoryExport(vocabularySuggestionListSource, "Saving");
    expectStoryExport(vocabularySuggestionListSource, "SavedDisabled");
    expectStoryExportBlockToContain(
      vocabularySuggestionListSource,
      "Idle",
      'getSuggestionState: () => "idle"',
    );
    expectStoryExportBlockToContain(
      vocabularySuggestionListSource,
      "Saving",
      'getSuggestionState: () => "saving"',
    );
    expectStoryExportBlockToContain(
      vocabularySuggestionListSource,
      "SavedDisabled",
      'getSuggestionState: () => "saved"',
    );

    const wordPopoverOpenStory = getStoryExportBlock(
      analysisResultSource,
      "WordPopoverOpen",
    );

    expect(wordPopoverOpenStory).toContain('activeVocabularyKey: "framework"');
    expectStoryExport(analysisResultSource, "NarrowTapOpen");
    expectStoryExport(webSurfaceSource, "NarrowSidebarOpen");
    expectStoryExport(desktopSurfaceSource, "SidebarOpen");
  });

  it("keeps analysis input stories on the shared product length limit", () => {
    const analysisInputSampleSource = readUiStorySource(
      "AnalysisInputSample.stories.tsx",
    );
    const inputComposerSource = readUiStorySource("InputComposer.stories.tsx");

    expectSharedImport(analysisInputSampleSource, "MAX_ANALYSIS_TEXT_LENGTH");
    expectSharedImport(inputComposerSource, "MAX_ANALYSIS_TEXT_LENGTH");
    expectSharedImport(inputComposerSource, "ANALYSIS_MODELS");
    expectSharedImport(inputComposerSource, "DEFAULT_ANALYSIS_MODEL_ID");
    expect(analysisInputSampleSource).not.toContain(
      "MAX_STORY_ANALYSIS_TEXT_LENGTH",
    );
    expect(inputComposerSource).not.toContain("MAX_STORY_ANALYSIS_TEXT_LENGTH");
    expect(inputComposerSource).not.toContain("487");
  });

  it("connects Storybook verification to the PR checklist and workflow docs", () => {
    expect(prTemplateSource).toContain("관련 lint/typecheck/test/build 실행");
    expect(prTemplateSource).toContain("UI 변경 시 화면 또는 Storybook 확인");
    expect(prWorkflowSource).toContain("Storybook 검증 기준");
    expect(prWorkflowSource).toContain(
      "Storybook 전용 build는 아직 별도 필수 check로 분리하지 않았으므로",
    );
    expect(prWorkflowSource).toContain("pnpm --filter @nado/ui test");
    expect(prWorkflowSource).toContain("pnpm --filter @nado/mobile test");
    expect(readmeSource).toContain("PR checklist");
  });

  it("connects token parity demo surfaces across Storybook and Mobile", () => {
    const foundationsSource = readStorySource("Foundations.stories.tsx");
    const mobileDemoSource = readFileSync(
      new URL(
        "../../../apps/mobile/src/features/design/MobileTokenParityDemoScreen.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    const mobileDemoDataSource = readFileSync(
      new URL(
        "../../../apps/mobile/src/features/design/designTokenDemo.ts",
        import.meta.url,
      ),
      "utf8",
    );
    const mobileStylesSource = readFileSync(
      new URL(
        "../../../apps/mobile/src/styles/mobileStyles.ts",
        import.meta.url,
      ),
      "utf8",
    );

    expect(foundationsSource).toContain("Button component");
    expect(foundationsSource).toContain("tokens.component.button");
    expect(foundationsSource).toContain("Chip component");
    expect(foundationsSource).toContain("tokens.component.chip");
    expect(foundationsSource).toContain("ReviewCard answer");
    expect(foundationsSource).toContain("tokens.component.reviewCard.answer");
    expect(foundationsSource).toContain("storybook-component-token-grid");
    expect(mobileDemoSource).toContain("getMobileTokenParityDemoSections");
    expect(mobileDemoDataSource).toContain("Button contract");
    expect(mobileDemoDataSource).toContain(
      "nativeTokens.component.button.send",
    );
    expect(mobileDemoDataSource).toContain("Card, Badge, Chip contract");
    expect(mobileDemoDataSource).toContain(
      "nativeTokens.component.chip.background",
    );
    expect(mobileDemoSource).toContain(
      'import { Badge, Button, Card, Chip, Stack, Text } from "@nado/ui/native";',
    );
    expect(mobileDemoSource).toContain('<Button variant="primary"');
    expect(mobileDemoSource).toContain('variant="send"');
    expect(mobileDemoSource).toContain("<Card");
    expect(mobileDemoSource).toContain('<Badge tone="neutral">');
    expect(mobileDemoSource).toContain("<Chip");
    expect(mobileStylesSource).not.toContain("designDemoSendIconButton");
    expect(mobileStylesSource).not.toContain("designDemoPrimaryButton");
    expect(tokenParityDemoSource).toContain(
      "낮은 위험 데모 표면이 `@nado/ui/native` facade의 Button, Stack, Text, Card, Badge, Chip을 실제로 import하는지",
    );
    expect(tokenParityDemoSource).toContain(
      "review answer style이 `nativeTokens.component.reviewCard.answer`를 따르는지",
    );
    expect(tokenParityDemoSource).toContain("Foundations/Tokens");
    expect(tokenParityDemoSource).toContain("UI/Button");
    expect(tokenParityDemoSource).toContain("Mobile Design Demo");
    expect(tokenParityDemoSource).toContain("pnpm --filter @nado/tokens test");
    expect(tokenParityDemoSource).toContain("pnpm --filter @nado/ui test");
    expect(tokenParityDemoSource).toContain(
      "pnpm --filter @nado/storybook build",
    );
    expect(tokenParityDemoSource).toContain(
      "EXPO_PUBLIC_NADO_MOBILE_DESIGN_DEMO=1",
    );
  });

  it("uses viewport globals for narrow sidebar stories", () => {
    const desktopSurfaceSource = readStorySource("DesktopSurface.stories.tsx");
    const webSurfaceSource = readStorySource("WebSurface.stories.tsx");
    const webNarrowSidebarOpenStory = getStoryExportBlock(
      webSurfaceSource,
      "NarrowSidebarOpen",
    );
    const desktopSidebarOpenStory = getStoryExportBlock(
      desktopSurfaceSource,
      "SidebarOpen",
    );

    expect(webNarrowSidebarOpenStory).toContain("globals:");
    expect(webNarrowSidebarOpenStory).toContain("viewport:");
    expect(webNarrowSidebarOpenStory).toContain('value: "mobile1"');
    expect(webNarrowSidebarOpenStory).not.toContain("defaultViewport");
    expect(desktopSidebarOpenStory).toContain("globals:");
    expect(desktopSidebarOpenStory).toContain("viewport:");
    expect(desktopSidebarOpenStory).toContain('value: "mobile1"');
    expect(desktopSidebarOpenStory).not.toContain("defaultViewport");
  });

  it("keeps the desktop review story aligned with desktop review CSS", () => {
    const desktopSurfaceSource = readStorySource("DesktopSurface.stories.tsx");

    expect(desktopSurfaceSource).not.toContain("ReviewCard,");
    expect(desktopSurfaceSource).toContain(
      "nado-review-card__answer--revealed",
    );
  });
});
