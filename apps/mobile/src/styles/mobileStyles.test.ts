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
