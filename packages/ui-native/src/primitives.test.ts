import { nativeTokens } from "@nado/tokens/react-native";
import { describe, expect, it } from "vitest";
import {
  createButtonStyle,
  createButtonTextStyle,
  createStackStyle,
  createTextStyle,
} from "./styles";

describe("@nado/ui-native primitive style contracts", () => {
  it("backs Button variants and sizes with native component tokens", () => {
    expect(createButtonStyle({ size: "md", variant: "primary" })).toMatchObject(
      {
        backgroundColor: nativeTokens.component.button.primary.background,
        borderRadius: nativeTokens.component.button.radius,
        minHeight: nativeTokens.component.button.size.md.height,
        paddingHorizontal: nativeTokens.component.button.size.md.paddingX,
      },
    );
    expect(createButtonTextStyle({ variant: "primary" })).toMatchObject({
      color: nativeTokens.component.button.primary.foreground,
      fontWeight: "800",
    });

    expect(
      createButtonStyle({ size: "icon", variant: "secondary" }),
    ).toMatchObject({
      backgroundColor: nativeTokens.component.button.secondary.background,
      borderColor: nativeTokens.component.button.secondary.border,
      borderRadius: nativeTokens.component.button.size.icon.radius,
      borderWidth: 1,
      minHeight: nativeTokens.component.button.size.icon.height,
      minWidth: nativeTokens.component.button.size.icon.width,
      paddingHorizontal: nativeTokens.component.button.size.icon.paddingX,
      width: nativeTokens.component.button.size.icon.width,
    });
  });

  it("maps Text props to native typography and semantic color tokens", () => {
    expect(
      createTextStyle({
        align: "center",
        size: "lg",
        tone: "muted",
        weight: "bold",
      }),
    ).toMatchObject({
      color: nativeTokens.color.inkMuted,
      fontSize: nativeTokens.typography.text.size.lg,
      fontWeight: "700",
      lineHeight: nativeTokens.typography.text.lineHeight.lg,
      textAlign: "center",
    });
  });

  it("maps Stack props to token gap and React Native flex values", () => {
    expect(
      createStackStyle({
        align: "end",
        direction: "horizontal",
        gap: "xl",
      }),
    ).toMatchObject({
      alignItems: "flex-end",
      flexDirection: "row",
      gap: nativeTokens.spacing.xl,
    });
  });
});
