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
    const demoPrimaryButtonStyle = mobileStylesSource.match(
      /designDemoPrimaryButton:\s*{(?<body>[\s\S]*?)\n  },/,
    )?.groups?.body;
    const demoSendIconButtonStyle = mobileStylesSource.match(
      /designDemoSendIconButton:\s*{(?<body>[\s\S]*?)\n  },/,
    )?.groups?.body;
    const demoSendIconButtonTextStyle = mobileStylesSource.match(
      /designDemoSendIconButtonText:\s*{(?<body>[\s\S]*?)\n  },/,
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
    expect(demoPrimaryButtonStyle ?? "").toContain(
      "backgroundColor: mobileButtonTokens.primary.background",
    );
    expect(demoPrimaryButtonStyle ?? "").toContain(
      "borderRadius: mobileButtonTokens.radius",
    );
    expect(demoPrimaryButtonStyle ?? "").toContain(
      "minHeight: mobileButtonTokens.size.md.height",
    );
    expect(demoSendIconButtonStyle ?? "").toContain(
      "backgroundColor: mobileButtonTokens.send.background",
    );
    expect(demoSendIconButtonStyle ?? "").toContain(
      "borderRadius: mobileButtonTokens.size.icon.radius",
    );
    expect(demoSendIconButtonStyle ?? "").toContain(
      "height: mobileButtonTokens.size.icon.height",
    );
    expect(demoSendIconButtonStyle ?? "").toContain(
      "minHeight: mobileButtonTokens.size.icon.height",
    );
    expect(demoSendIconButtonStyle ?? "").toContain(
      "minWidth: mobileButtonTokens.size.icon.width",
    );
    expect(demoSendIconButtonStyle ?? "").toContain(
      "paddingHorizontal: mobileButtonTokens.size.icon.paddingX",
    );
    expect(demoSendIconButtonStyle ?? "").toContain(
      "width: mobileButtonTokens.size.icon.width",
    );
    expect(demoSendIconButtonTextStyle ?? "").toContain(
      "color: mobileButtonTokens.send.foreground",
    );
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

  it("allows long mobile vocabulary suggestions to wrap within the screen", () => {
    expect(mobileStylesSource).toContain("suggestionChip");
    expect(mobileStylesSource).toContain('maxWidth: "100%"');
    expect(mobileStylesSource).toContain("suggestionText");
    expect(mobileStylesSource).toContain("flexShrink: 1");
    expect(mobileStylesSource).toContain("minWidth: 0");
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
    expect(reviewAnswerStyle).toContain('backgroundColor: "#f6f8ff"');
    expect(reviewAnswerStyle).toContain('borderColor: "#d5dbea"');
    expect(reviewAnswerStyle).toContain("color: mobileColors.inkMuted");
    expect(reviewAnswerStyle).toContain('filter: "blur(5px)"');
    expect(reviewAnswerStyle).toContain('userSelect: "none"');
    expect(reviewAnswerRevealedStyle).toContain('filter: "none"');
    expect(reviewAnswerRevealedStyle).toContain('userSelect: "auto"');
    expect(mobileStylesSource).not.toContain("textShadowRadius: 6");
  });
});
