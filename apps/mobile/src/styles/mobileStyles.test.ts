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

  it("floats the mobile word definition card without changing chunk layout", () => {
    expect(mobileStylesSource).toContain("wordDefinitionCard");
    expect(mobileStylesSource).toContain('position: "absolute"');
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
});
