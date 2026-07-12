import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  MAX_ANALYSIS_TEXT_LENGTH,
  countAnalysisTextCharacters,
} from "@nado/shared/analysis-input";
import { analysisSurfaceMock } from "../../../packages/ui-web/src/analysisStoryFixtures";

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
const expectSharedImport = (
  source: string,
  exportName: string,
  subpath: string,
) => {
  expect(source).toMatch(
    new RegExp(
      `import\\s*{[^}]*\\b${escapeRegExp(exportName)}\\b[^}]*}\\s*from\\s*"@nado/shared/${escapeRegExp(subpath)}"`,
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
const storybookPreviewSource = readFileSync(
  new URL("../.storybook/preview.ts", import.meta.url),
  "utf8",
);
const storybookBrowserTestConfigSource = readFileSync(
  new URL("../vitest.storybook.config.ts", import.meta.url),
  "utf8",
);
const storybookBundleBudgetSource = readFileSync(
  new URL("../scripts/verify-bundle-budget.mjs", import.meta.url),
  "utf8",
);
const ciWorkflowSource = readFileSync(
  new URL("../../../.github/workflows/ci.yml", import.meta.url),
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
      "ReviewSessionView.stories.tsx",
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
    for (const command of ["test", "test:stories", "typecheck", "build"]) {
      expect(readmeSource).toContain(
        `pnpm --filter @nado/storybook ${command}`,
      );
    }
  });

  it("runs smoke, interaction, and accessibility checks in Chromium", () => {
    expect(packageJson.scripts["test:stories"]).toContain("vitest run");
    expect(storybookConfigSource).toContain("@storybook/addon-a11y");
    expect(storybookConfigSource).toContain("@storybook/addon-vitest");
    expect(storybookPreviewSource).toContain('test: "error"');
    expect(storybookBrowserTestConfigSource).toContain("playwright({})");
    expect(storybookBrowserTestConfigSource).toContain(
      'instances: [{ browser: "chromium" }]',
    );
    expect(ciWorkflowSource).toContain(
      "pnpm --filter @nado/storybook test:stories",
    );

    const interactionStories: Array<readonly [string, string]> = [
      [readUiStorySource("AnalysisResult.stories.tsx"), "WordPopoverOpen"],
      [
        readUiStorySource("VocabularySuggestionList.stories.tsx"),
        "SavedDisabled",
      ],
      [readUiStorySource("InputComposer.stories.tsx"), "Basic"],
      [readUiStorySource("AnalysisResult.stories.tsx"), "NarrowTapOpen"],
      [readStorySource("WebSurface.stories.tsx"), "NarrowSidebarOpen"],
      [readStorySource("DesktopSurface.stories.tsx"), "SidebarOpen"],
    ];

    for (const [source, exportName] of interactionStories) {
      expect(getStoryExportBlock(source, exportName)).toContain("play:");
    }
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
    const narrowTapOpenStory = getStoryExportBlock(
      analysisResultSource,
      "NarrowTapOpen",
    );

    expect(wordPopoverOpenStory).toContain('activeVocabularyKey: "framework"');
    expect(wordPopoverOpenStory).toContain('name: "framework 뜻과 저장 액션"');
    expect(wordPopoverOpenStory).toContain('name: "framework 저장"');
    expect(narrowTapOpenStory).toContain('name: "setup 뜻과 저장 액션 보기"');
    expect(narrowTapOpenStory).toContain('keys: "[TouchA]"');
    expect(narrowTapOpenStory).toContain('name: "setup 뜻과 저장 액션"');
    expectStoryExport(webSurfaceSource, "NarrowSidebarOpen");
    expectStoryExport(desktopSurfaceSource, "SidebarOpen");
  });

  it("keeps analysis input stories on the shared product length limit", () => {
    const analysisInputSampleSource = readUiStorySource(
      "AnalysisInputSample.stories.tsx",
    );
    const inputComposerSource = readUiStorySource("InputComposer.stories.tsx");

    expectSharedImport(
      analysisInputSampleSource,
      "MAX_ANALYSIS_TEXT_LENGTH",
      "analysis-input",
    );
    expectSharedImport(
      inputComposerSource,
      "MAX_ANALYSIS_TEXT_LENGTH",
      "analysis-input",
    );
    expectSharedImport(
      inputComposerSource,
      "ANALYSIS_MODELS",
      "analysis-input",
    );
    expectSharedImport(
      inputComposerSource,
      "DEFAULT_ANALYSIS_MODEL_ID",
      "analysis-input",
    );
    expect(analysisInputSampleSource).not.toContain(
      "MAX_STORY_ANALYSIS_TEXT_LENGTH",
    );
    expect(inputComposerSource).not.toContain("MAX_STORY_ANALYSIS_TEXT_LENGTH");
    expect(inputComposerSource).not.toContain("487");
  });

  it("keeps app surface mock input within the product length limit", () => {
    expect(
      countAnalysisTextCharacters(analysisSurfaceMock.sourceText),
    ).toBeLessThanOrEqual(MAX_ANALYSIS_TEXT_LENGTH);
  });

  it("connects Storybook verification to the PR checklist and workflow docs", () => {
    expect(prTemplateSource).toContain("관련 lint/typecheck/test/build 실행");
    expect(prTemplateSource).toContain("UI 변경 시 화면 또는 Storybook 확인");
    expect(prWorkflowSource).toContain("Storybook 검증 기준");
    expect(prWorkflowSource).toContain(
      "../../apps/storybook/README.md#검증-명령",
    );
    expect(readmeSource).toContain("pnpm --filter @nado/storybook test`");
    expect(readmeSource).toContain(
      "pnpm --filter @nado/storybook test:stories`",
    );
    expect(readmeSource).toContain("pnpm --filter @nado/storybook typecheck`");
    expect(readmeSource).toContain("pnpm --filter @nado/storybook build`");
    expect(readmeSource).toContain("PR checklist");
  });

  it("enforces separate Storybook framework and product story budgets", () => {
    expect(storybookConfigSource).toContain(
      "STORYBOOK_FRAMEWORK_CHUNK_WARNING_LIMIT_KB = 1_200",
    );
    expect(packageJson.scripts.build).toContain(
      "scripts/verify-bundle-budget.mjs",
    );
    expect(storybookBundleBudgetSource).toContain(
      "STORY_ENTRY_BUDGET_BYTES = 100_000",
    );
    expect(storybookBundleBudgetSource).toContain(
      "PRODUCT_SHARED_CHUNK_BUDGET_BYTES = 150_000",
    );
    expect(storybookBundleBudgetSource).toContain(
      "PREVIEW_FRAMEWORK_CHUNK_BUDGET_BYTES = 1_200_000",
    );
    expect(storybookBundleBudgetSource).toContain(
      "MANAGER_RUNTIME_CHUNK_BUDGET_BYTES = 3_300_000",
    );
    expect(storybookBundleBudgetSource).toContain(
      'resolve(outputDirectory, ".vite/manifest.json")',
    );
    expect(storybookBundleBudgetSource).toContain(
      "collectJavaScriptFiles(absolutePath)",
    );
    expect(storybookBundleBudgetSource).toContain(
      'relativePath.startsWith("sb-manager/")',
    );
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
    expect(tokenParityDemoSource).toContain("@nado/ui/native");
    expect(tokenParityDemoSource).toContain(
      "nativeTokens.component.reviewCard.answer",
    );
    expect(tokenParityDemoSource).toContain("Foundations/Tokens");
    expect(tokenParityDemoSource).toContain("UI/Button");
    expect(tokenParityDemoSource).toContain("Mobile Design Demo");
    expect(tokenParityDemoSource).toContain("pnpm --filter @nado/tokens test");
    expect(tokenParityDemoSource).toContain("pnpm --filter @nado/ui test");
    expect(tokenParityDemoSource).toContain(
      "../../apps/storybook/README.md#검증-명령",
    );
    expect(tokenParityDemoSource).toContain(
      "pnpm --filter @nado/mobile dev:design",
    );
    expect(tokenParityDemoSource).toContain(
      "pnpm --filter @nado/mobile test:design-bundle",
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
