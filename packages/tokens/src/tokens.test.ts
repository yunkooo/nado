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

  it("reuses color tokens without changing their platform value", () => {
    expect(nativeTokens.color).toBe(tokens.color);
  });
});
