import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
);
const mobileStylesSource = readFileSync(
  new URL("./mobileStyles.ts", import.meta.url),
  "utf8",
);

describe("mobile shared style tokens", () => {
  it("declares the shared token package dependency", () => {
    expect(packageJson.dependencies["@nado/tokens"]).toBe("workspace:*");
  });

  it("uses the React Native token adapter as the mobile style source", () => {
    expect(mobileStylesSource).toContain(
      'import { nativeTokens } from "@nado/tokens/react-native";',
    );
    expect(mobileStylesSource).toContain(
      "export const mobileRadius = nativeTokens.radius;",
    );
    expect(mobileStylesSource).toContain(
      "export const mobileSpacing = nativeTokens.spacing;",
    );
    expect(mobileStylesSource).toContain(
      "export const mobileButtonTokens = nativeTokens.component.button;",
    );
    expect(mobileStylesSource).toContain(
      "export const mobileReviewCardTokens = nativeTokens.component.reviewCard;",
    );
  });

  it("keeps core mobile color aliases backed by shared color tokens", () => {
    for (const colorName of [
      "canvas",
      "surface",
      "surfaceMuted",
      "sidebar",
      "sidebarActive",
      "ink",
      "inkMuted",
      "border",
      "primary",
      "primaryInk",
    ]) {
      expect(mobileStylesSource).toContain(
        `${colorName}: nativeTokens.color.${colorName}`,
      );
    }
  });

  it("uses native radius and spacing helpers for repeated layout primitives", () => {
    expect(mobileStylesSource).toContain("borderRadius: mobileRadius.md");
    expect(mobileStylesSource).toContain("borderRadius: mobileRadius.composer");
    expect(mobileStylesSource).toContain("borderRadius: mobileRadius.pill");
    expect(mobileStylesSource).toContain("gap: mobileSpacing.sm");
    expect(mobileStylesSource).toContain("paddingHorizontal: mobileSpacing.md");
  });

  it("lets the analysis composer settle at the bottom of scroll content", () => {
    const contentStyle = mobileStylesSource.match(
      /content:\s*{(?<body>[\s\S]*?)\n  },/,
    )?.groups?.body;
    const composerWrapStyle = mobileStylesSource.match(
      /composerWrap:\s*{(?<body>[\s\S]*?)\n  },/,
    )?.groups?.body;

    expect(contentStyle).toContain("flexGrow: 1");
    expect(composerWrapStyle).toContain('marginTop: "auto"');
  });

  it("keeps the analyze icon button backed by send icon component tokens", () => {
    const analyzeButtonStyle = mobileStylesSource.match(
      /analyzeButton:\s*{(?<body>[\s\S]*?)\n  },/,
    )?.groups?.body;
    const analyzeButtonTextStyle = mobileStylesSource.match(
      /analyzeButtonText:\s*{(?<body>[\s\S]*?)\n  },/,
    )?.groups?.body;

    expect(analyzeButtonStyle).toContain(
      "backgroundColor: mobileButtonTokens.send.background",
    );
    expect(analyzeButtonStyle).toContain(
      "borderRadius: mobileButtonTokens.size.icon.radius",
    );
    expect(analyzeButtonStyle).toContain(
      "height: mobileButtonTokens.size.icon.height",
    );
    expect(analyzeButtonStyle).toContain(
      "minHeight: mobileButtonTokens.size.icon.height",
    );
    expect(analyzeButtonStyle).toContain(
      "minWidth: mobileButtonTokens.size.icon.width",
    );
    expect(analyzeButtonStyle).toContain(
      "width: mobileButtonTokens.size.icon.width",
    );
    expect(analyzeButtonTextStyle).toContain(
      "color: mobileButtonTokens.send.foreground",
    );
  });

  it("keeps the primary action button backed by primary md component tokens", () => {
    const primaryButtonStyle = mobileStylesSource.match(
      /primaryButton:\s*{(?<body>[\s\S]*?)\n  },/,
    )?.groups?.body;
    const primaryButtonTextStyle = mobileStylesSource.match(
      /primaryButtonText:\s*{(?<body>[\s\S]*?)\n  },/,
    )?.groups?.body;

    expect(primaryButtonStyle).toContain(
      "backgroundColor: mobileButtonTokens.primary.background",
    );
    expect(primaryButtonStyle).toContain(
      "borderRadius: mobileButtonTokens.radius",
    );
    expect(primaryButtonStyle).toContain(
      "minHeight: mobileButtonTokens.size.md.height",
    );
    expect(primaryButtonStyle).toContain(
      "paddingHorizontal: mobileButtonTokens.size.md.paddingX",
    );
    expect(primaryButtonTextStyle).toContain(
      "color: mobileButtonTokens.primary.foreground",
    );
  });

  it("backs the mobile token parity demo surface with shared native tokens", () => {
    const demoSurfaceStyle = mobileStylesSource.match(
      /designDemoSurface:\s*{(?<body>[\s\S]*?)\n  },/,
    )?.groups?.body;
    const demoPrimarySwatchStyle = mobileStylesSource.match(
      /designDemoPrimarySwatch:\s*{(?<body>[\s\S]*?)\n  },/,
    )?.groups?.body;
    const demoTokenSourceStyle = mobileStylesSource.match(
      /designDemoTokenSource:\s*{(?<body>[\s\S]*?)\n  },/,
    )?.groups?.body;
    const demoTokenSourceTextStyle = mobileStylesSource.match(
      /designDemoTokenSourceText:\s*{(?<body>[\s\S]*?)\n  },/,
    )?.groups?.body;

    expect(demoSurfaceStyle ?? "").toContain(
      "backgroundColor: mobileColors.surface",
    );
    expect(demoSurfaceStyle ?? "").toContain("borderRadius: mobileRadius.md");
    expect(demoSurfaceStyle ?? "").toContain("gap: mobileSpacing.md");
    expect(demoPrimarySwatchStyle ?? "").toContain(
      "backgroundColor: mobileColors.primary",
    );
    expect(demoPrimarySwatchStyle ?? "").toContain(
      "borderRadius: mobileRadius.md",
    );
    expect(mobileStylesSource).not.toContain("designDemoPrimaryButton");
    expect(mobileStylesSource).not.toContain("designDemoSecondaryButton");
    expect(mobileStylesSource).not.toContain("designDemoSendIconButton");
    expect(demoTokenSourceStyle ?? "").toContain(
      "backgroundColor: mobileColors.surfaceMuted",
    );
    expect(demoTokenSourceStyle ?? "").toContain(
      "borderRadius: mobileRadius.sm",
    );
    expect(demoTokenSourceStyle ?? "").toContain('maxWidth: "100%"');
    expect(demoTokenSourceTextStyle ?? "").toContain("flexShrink: 1");
    expect(demoTokenSourceTextStyle ?? "").toContain("minWidth: 0");
  });

  it("keeps mobile vocabulary meaning card styles limited to inner layout", () => {
    const meaningCardStyle = mobileStylesSource.match(
      /meaningCard:\s*{(?<body>[\s\S]*?)\n  },/,
    )?.groups?.body;

    expect(mobileStylesSource).toContain("meaningCard");
    expect(meaningCardStyle).toContain("gap: mobileSpacing.xs");
    expect(meaningCardStyle).not.toContain("backgroundColor:");
    expect(meaningCardStyle).not.toContain("borderColor:");
    expect(meaningCardStyle).not.toContain("borderRadius:");
    expect(meaningCardStyle).not.toContain("borderWidth:");
    expect(meaningCardStyle).not.toContain("paddingHorizontal:");
    expect(meaningCardStyle).not.toContain("paddingVertical:");
  });

  it("keeps mobile vocabulary item styles limited to card layout after moving the surface to ui-native Card", () => {
    const vocabularyItemStyle = mobileStylesSource.match(
      /vocabularyItem:\s*{(?<body>[\s\S]*?)\n  },/,
    )?.groups?.body;

    expect(mobileStylesSource).toContain("vocabularyItem");
    expect(vocabularyItemStyle).toContain("gap: 14");
    expect(vocabularyItemStyle).toContain("minHeight: 220");
    expect(vocabularyItemStyle).not.toContain("backgroundColor:");
    expect(vocabularyItemStyle).not.toContain("borderColor:");
    expect(vocabularyItemStyle).not.toContain("borderRadius:");
    expect(vocabularyItemStyle).not.toContain("borderWidth:");
    expect(vocabularyItemStyle).not.toContain("padding:");
    expect(vocabularyItemStyle).not.toContain("shadowColor:");
    expect(vocabularyItemStyle).not.toContain("shadowOffset:");
    expect(vocabularyItemStyle).not.toContain("shadowOpacity:");
    expect(vocabularyItemStyle).not.toContain("shadowRadius:");
  });

  it("renders the mobile word definition card as an anchored overlay", () => {
    const wordDefinitionCardStyle = mobileStylesSource.match(
      /wordDefinitionCard:\s*{(?<body>[\s\S]*?)\n  },/,
    )?.groups?.body;
    const wordDefinitionPopoverCardStyle = mobileStylesSource.match(
      /wordDefinitionPopoverCard:\s*{(?<body>[\s\S]*?)\n  },/,
    )?.groups?.body;

    expect(mobileStylesSource).toContain("wordDefinitionCard");
    expect(wordDefinitionCardStyle).toContain('alignSelf: "stretch"');
    expect(wordDefinitionCardStyle).toContain("gap: 10");
    expect(wordDefinitionCardStyle).not.toContain("backgroundColor:");
    expect(wordDefinitionCardStyle).not.toContain("borderColor:");
    expect(wordDefinitionCardStyle).not.toContain("borderRadius:");
    expect(wordDefinitionCardStyle).not.toContain("borderWidth:");
    expect(wordDefinitionCardStyle).not.toContain("elevation:");
    expect(wordDefinitionCardStyle).not.toContain("paddingHorizontal:");
    expect(wordDefinitionCardStyle).not.toContain("paddingVertical:");
    expect(wordDefinitionCardStyle).not.toContain("shadowColor:");
    expect(wordDefinitionCardStyle).not.toContain("shadowOffset:");
    expect(wordDefinitionCardStyle).not.toContain("shadowOpacity:");
    expect(wordDefinitionCardStyle).not.toContain("shadowRadius:");
    expect(mobileStylesSource).toContain("wordPopoverOverlay");
    expect(wordDefinitionPopoverCardStyle).toContain('position: "absolute"');
    expect(wordDefinitionPopoverCardStyle).toContain("zIndex: 40");
    expect(mobileStylesSource).toContain("chunkUnitActive");
    expect(mobileStylesSource).toContain("sentenceCardActive");
  });

  it("keeps mobile reading chunks in a wrapping row flow", () => {
    expect(mobileStylesSource).toContain("chunkLine");
    expect(mobileStylesSource).toContain('flexDirection: "row"');
    expect(mobileStylesSource).toContain('flexWrap: "wrap"');
    expect(mobileStylesSource).toContain("chunkSlash");
    expect(mobileStylesSource).toContain("flexShrink: 1");
  });

  it("keeps only suggestion chip state overrides after moving base layout to ui-native Chip", () => {
    const suggestionChipSavedStyle = mobileStylesSource.match(
      /suggestionChipSaved:\s*{(?<body>[\s\S]*?)\n  },/,
    )?.groups?.body;
    const suggestionChipSavingStyle = mobileStylesSource.match(
      /suggestionChipSaving:\s*{(?<body>[\s\S]*?)\n  },/,
    )?.groups?.body;

    expect(mobileStylesSource).not.toContain("suggestionChip: {");
    expect(mobileStylesSource).not.toContain("suggestionPrefix: {");
    expect(mobileStylesSource).not.toContain("suggestionText: {");
    expect(mobileStylesSource).toContain("suggestionChipSaved");
    expect(mobileStylesSource).toContain("suggestionChipSaving");
    expect(suggestionChipSavedStyle).toContain("opacity: 1");
    expect(suggestionChipSavingStyle).toContain("opacity: 0.64");
  });

  it("shows a chevron affordance in the mobile model selector trigger", () => {
    const modelSelectButtonStyle = mobileStylesSource.match(
      /modelSelectButton:\s*{(?<body>[\s\S]*?)\n  },/,
    )?.groups?.body;
    const modelSelectChevronStyle = mobileStylesSource.match(
      /modelSelectChevron:\s*{(?<body>[\s\S]*?)\n  },/,
    )?.groups?.body;

    expect(modelSelectButtonStyle).toContain('flexDirection: "row"');
    expect(modelSelectButtonStyle).toContain("gap: 8");
    expect(modelSelectChevronStyle).toContain(
      "borderRightColor: mobileColors.inkMuted",
    );
    expect(modelSelectChevronStyle).toContain(
      'transform: [{ rotate: "45deg" }]',
    );
  });

  it("matches the web and desktop review answer colors", () => {
    const reviewAnswerStyle = mobileStylesSource.match(
      /reviewAnswer:\s*{(?<body>[\s\S]*?)\n  },/,
    )?.groups?.body;
    const reviewAnswerRevealedStyle = mobileStylesSource.match(
      /reviewAnswerRevealed:\s*{(?<body>[\s\S]*?)\n  },/,
    )?.groups?.body;

    expect(mobileStylesSource).not.toContain("reviewAnswerHiddenBox");
    expect(mobileStylesSource).not.toContain("reviewAnswerHidden");
    expect(reviewAnswerStyle).toContain(
      "backgroundColor: mobileReviewCardTokens.answer.background",
    );
    expect(reviewAnswerStyle).toContain(
      "borderColor: mobileReviewCardTokens.answer.border",
    );
    expect(reviewAnswerStyle).toContain(
      "borderRadius: mobileReviewCardTokens.answer.radius",
    );
    expect(reviewAnswerStyle).toContain(
      "color: mobileReviewCardTokens.answer.foreground",
    );
    expect(reviewAnswerStyle).toContain(
      "padding: mobileReviewCardTokens.answer.padding",
    );
    expect(reviewAnswerStyle).toContain('filter: "blur(5px)"');
    expect(reviewAnswerStyle).toContain('userSelect: "none"');
    expect(reviewAnswerRevealedStyle).toContain('filter: "none"');
    expect(reviewAnswerRevealedStyle).toContain('userSelect: "auto"');
    expect(mobileStylesSource).not.toContain("textShadowRadius: 6");
  });
});
