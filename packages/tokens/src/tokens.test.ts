import { describe, expect, it } from "vitest";
import { tokens } from "@nado/tokens";
import { nativeTokens } from "@nado/tokens/react-native";

describe("@nado/tokens", () => {
  it("exports the shared product color tokens", () => {
    expect(tokens.color).toMatchObject({
      canvas: "#f1f1ed",
      primary: "#26365f",
      primaryInk: "#ffffff",
    });
  });

  it("keeps web spacing and radius tokens as CSS lengths", () => {
    expect(tokens.spacing.md).toBe("12px");
    expect(tokens.radius.composer).toBe("18px");
  });

  it("exports typography tokens for shared text primitives", () => {
    expect(tokens.typography.text.size).toMatchObject({
      md: "16px",
      xl: "22px",
    });
    expect(tokens.typography.text.lineHeight).toMatchObject({
      md: "26px",
      xl: "32px",
    });
    expect(tokens.typography.text.weight).toMatchObject({
      regular: 400,
      medium: 600,
      bold: 700,
      heavy: 800,
    });
  });

  it("adapts spacing and radius tokens to React Native numbers", () => {
    expect(nativeTokens.spacing).toMatchObject({
      md: 12,
      xl: 24,
    });
    expect(nativeTokens.radius).toMatchObject({
      composer: 18,
      pill: 999,
    });
  });

  it("adapts typography size tokens to React Native numbers", () => {
    expect(nativeTokens.typography.text.size).toMatchObject({
      md: 16,
      xl: 22,
    });
    expect(nativeTokens.typography.text.lineHeight).toMatchObject({
      md: 26,
      xl: 32,
    });
    expect(nativeTokens.typography.text.weight.heavy).toBe(800);
  });

  it("reuses color tokens without changing their platform value", () => {
    expect(nativeTokens.color).toBe(tokens.color);
  });

  it("exports component tokens for button variants and sizes", () => {
    expect(tokens.component.button.primary).toMatchObject({
      background: tokens.color.primary,
      foreground: tokens.color.primaryInk,
    });
    expect(tokens.component.button.secondary).toMatchObject({
      background: tokens.color.surfaceMuted,
      border: tokens.color.border,
      foreground: tokens.color.ink,
    });
    expect(tokens.component.button.send).toEqual(
      tokens.component.button.primary,
    );
    expect(tokens.component.button.size.md).toMatchObject({
      height: "40px",
      paddingX: "16px",
    });
    expect(tokens.component.button.size.icon).toMatchObject({
      height: "38px",
      radius: tokens.radius.pill,
      width: "38px",
    });
  });

  it("adapts component size tokens to React Native numbers", () => {
    expect(nativeTokens.component.button.size).toMatchObject({
      sm: {
        height: 32,
        paddingX: 12,
      },
      md: {
        height: 40,
        paddingX: 16,
      },
      icon: {
        height: 38,
        radius: 999,
        width: 38,
      },
    });
    expect(nativeTokens.component.button.primary.background).toBe(
      tokens.color.primary,
    );
    expect(nativeTokens.component.button.send.background).toBe(
      tokens.color.primary,
    );
  });
});
