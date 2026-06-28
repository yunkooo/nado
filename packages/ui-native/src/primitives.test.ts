import { nativeTokens } from "@nado/tokens/react-native";
import {
  Children,
  Fragment,
  createElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";
import { Card } from "./Card";
import {
  createCardStyle,
  createButtonStyle,
  createButtonTextStyle,
  createStackStyle,
  createTextStyle,
} from "./styles";

const nativeMocks = vi.hoisted(() => ({
  Pressable: "Pressable",
  Text: "Text",
  View: "View",
}));

vi.mock("react-native", () => nativeMocks);

describe("@nado/ui-native primitive style contracts", () => {
  it("wraps text labels but renders icon children without nesting them in Text", () => {
    const labelButton = Button({ children: "Save" }) as ReactElement<{
      children: ReactElement<{ children: ReactNode }>;
    }>;
    const icon = createElement(nativeMocks.View, { testID: "save-icon" });
    const iconButton = Button({
      accessibilityLabel: "Save",
      children: icon,
      size: "icon",
    }) as ReactElement<{ children: ReactNode }>;

    expect(labelButton.props.children.type).toBe(nativeMocks.Text);
    expect(labelButton.props.children.props.children).toBe("Save");
    expect(iconButton.props.children).toBe(icon);
  });

  it("wraps mixed and fragment text children without nesting icon children in Text", () => {
    const icon = createElement(nativeMocks.View, { testID: "save-icon" });
    const mixedButton = Button({
      children: [icon, "Save"],
    }) as ReactElement<{ children: ReactNode }>;
    const mixedChildren = Children.toArray(
      mixedButton.props.children,
    ) as ReactElement<{ children?: ReactNode }>[];

    expect(mixedChildren[0]?.type).toBe(nativeMocks.View);
    expect(mixedChildren[1]?.type).toBe(nativeMocks.Text);
    expect(mixedChildren[1]?.props.children).toBe("Save");

    const fragmentButton = Button({
      children: createElement(Fragment, null, icon, "Save"),
    }) as ReactElement<{ children: ReactElement<{ children: ReactNode }> }>;
    const fragmentChildren = Children.toArray(
      fragmentButton.props.children.props.children,
    ) as ReactElement<{ children?: ReactNode }>[];

    expect(fragmentButton.props.children.type).toBe(Fragment);
    expect(fragmentChildren[0]?.type).toBe(nativeMocks.View);
    expect(fragmentChildren[1]?.type).toBe(nativeMocks.Text);
    expect(fragmentChildren[1]?.props.children).toBe("Save");
  });

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

  it("renders Card as a View with token-backed styles and custom style", () => {
    const customStyle = { marginTop: nativeTokens.spacing.xs };
    const card = Card({
      children: "Summary",
      padding: "lg",
      radius: "composer",
      style: customStyle,
      testID: "summary-card",
      tone: "elevated",
    }) as ReactElement<{
      children: ReactNode;
      style: unknown[];
      testID: string;
    }>;

    expect(card.type).toBe(nativeMocks.View);
    expect(card.props.children.type).toBe(nativeMocks.Text);
    expect(card.props.children.props.children).toBe("Summary");
    expect(card.props.testID).toBe("summary-card");
    expect(card.props.style).toEqual([
      expect.objectContaining({
        backgroundColor: nativeTokens.color.surface,
        borderColor: nativeTokens.color.border,
        borderRadius: nativeTokens.radius.composer,
        borderWidth: 1,
        elevation: 4,
        padding: nativeTokens.spacing.lg,
        shadowColor: nativeTokens.color.ink,
        shadowOpacity: 0.08,
        shadowRadius: 18,
      }),
      customStyle,
    ]);
  });

  it("wraps mixed Card text children without wrapping element children", () => {
    const icon = createElement(nativeMocks.View, { testID: "summary-icon" });
    const mixedCard = Card({
      children: [icon, "Summary"],
    }) as ReactElement<{ children: ReactNode }>;
    const mixedChildren = Children.toArray(
      mixedCard.props.children,
    ) as ReactElement<{ children?: ReactNode }>[];

    expect(mixedChildren[0]?.type).toBe(nativeMocks.View);
    expect(mixedChildren[1]?.type).toBe(nativeMocks.Text);
    expect(mixedChildren[1]?.props.children).toBe("Summary");

    const fragmentCard = Card({
      children: createElement(Fragment, null, icon, "Summary"),
    }) as ReactElement<{ children: ReactElement<{ children: ReactNode }> }>;
    const fragmentChildren = Children.toArray(
      fragmentCard.props.children.props.children,
    ) as ReactElement<{ children?: ReactNode }>[];

    expect(fragmentCard.props.children.type).toBe(Fragment);
    expect(fragmentChildren[0]?.type).toBe(nativeMocks.View);
    expect(fragmentChildren[1]?.type).toBe(nativeMocks.Text);
    expect(fragmentChildren[1]?.props.children).toBe("Summary");
  });

  it("maps Card tone, padding, and radius props to native tokens", () => {
    expect(
      createCardStyle({ padding: "sm", radius: "sm", tone: "muted" }),
    ).toMatchObject({
      backgroundColor: nativeTokens.color.surfaceMuted,
      borderColor: nativeTokens.color.border,
      borderRadius: nativeTokens.radius.sm,
      borderWidth: 1,
      padding: nativeTokens.spacing.sm,
    });

    expect(createCardStyle({ tone: "surface" })).not.toHaveProperty(
      "elevation",
    );
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
