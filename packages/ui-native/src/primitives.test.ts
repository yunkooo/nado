import { nativeTokens } from "@nado/tokens/react-native";
import {
  Children,
  Fragment,
  createElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { describe, expect, it, vi } from "vitest";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { Card } from "./Card";
import { Chip } from "./Chip";
import {
  createBadgeStyle,
  createBadgeTextStyle,
  buttonPressedStyle,
  createButtonStyle,
  createButtonTextStyle,
  createCardStyle,
  createChipLabelStyle,
  createChipPrefixStyle,
  createChipStyle,
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

  it("renders Badge as a View with token-backed label styles", () => {
    const customStyle = { marginTop: nativeTokens.spacing.xs };
    const textStyle = { letterSpacing: 0.2 };
    const badge = Badge({
      children: "noun",
      size: "md",
      style: customStyle,
      testID: "word-type",
      textStyle,
      tone: "warning",
    }) as ReactElement<{
      children: ReactElement<{ children: ReactNode; style: unknown[] }>;
      style: unknown[];
      testID: string;
    }>;

    expect(badge.type).toBe(nativeMocks.View);
    expect(badge.props.testID).toBe("word-type");
    expect(badge.props.children.type).toBe(nativeMocks.Text);
    expect(badge.props.children.props.children).toBe("noun");
    expect(badge.props.children.props.style).toEqual([
      expect.objectContaining({
        color: nativeTokens.color.ink,
        fontSize: nativeTokens.typography.text.size.sm,
        fontWeight: "700",
        lineHeight: nativeTokens.typography.text.lineHeight.sm,
      }),
      textStyle,
    ]);
    expect(badge.props.style).toEqual([
      expect.objectContaining({
        backgroundColor: nativeTokens.color.surfaceMuted,
        borderColor: nativeTokens.color.inkMuted,
        borderRadius: nativeTokens.radius.pill,
        borderWidth: 1,
        paddingHorizontal: nativeTokens.spacing.md,
        paddingVertical: nativeTokens.spacing.sm,
      }),
      customStyle,
    ]);
  });

  it("wraps mixed Badge text children without wrapping element children", () => {
    const icon = createElement(nativeMocks.View, { testID: "badge-icon" });
    const mixedBadge = Badge({
      children: [icon, "Beta"],
      tone: "primary",
    }) as ReactElement<{ children: ReactNode }>;
    const mixedChildren = Children.toArray(
      mixedBadge.props.children,
    ) as ReactElement<{ children?: ReactNode }>[];

    expect(mixedChildren[0]?.type).toBe(nativeMocks.View);
    expect(mixedChildren[1]?.type).toBe(nativeMocks.Text);
    expect(mixedChildren[1]?.props.children).toBe("Beta");

    const fragmentBadge = Badge({
      children: createElement(Fragment, null, icon, "Beta"),
    }) as ReactElement<{ children: ReactElement<{ children: ReactNode }> }>;
    const fragmentChildren = Children.toArray(
      fragmentBadge.props.children.props.children,
    ) as ReactElement<{ children?: ReactNode }>[];

    expect(fragmentBadge.props.children.type).toBe(Fragment);
    expect(fragmentChildren[0]?.type).toBe(nativeMocks.View);
    expect(fragmentChildren[1]?.type).toBe(nativeMocks.Text);
    expect(fragmentChildren[1]?.props.children).toBe("Beta");
  });

  it("maps Badge tones and sizes to native tokens", () => {
    expect(createBadgeStyle({ size: "sm", tone: "neutral" })).toMatchObject({
      backgroundColor: nativeTokens.color.surfaceMuted,
      borderColor: nativeTokens.color.border,
      borderRadius: nativeTokens.radius.pill,
      borderWidth: 1,
      paddingHorizontal: nativeTokens.spacing.sm,
      paddingVertical: nativeTokens.spacing.xs,
    });

    expect(createBadgeStyle({ tone: "primary" })).toMatchObject({
      backgroundColor: nativeTokens.color.primary,
      borderColor: nativeTokens.color.primary,
    });
    expect(createBadgeTextStyle({ tone: "primary" })).toMatchObject({
      color: nativeTokens.color.primaryInk,
    });

    expect(createBadgeTextStyle({ tone: "success" })).toMatchObject({
      color: nativeTokens.color.primary,
    });
    expect(createBadgeTextStyle({ tone: "warning" })).toMatchObject({
      color: nativeTokens.color.ink,
    });
    expect(createBadgeTextStyle({ tone: "danger" })).toMatchObject({
      color: nativeTokens.color.accent,
    });
  });

  it("renders Chip as a Pressable with token-backed prefix and label text", () => {
    const customStyle = { marginTop: nativeTokens.spacing.xs };
    const labelStyle = { letterSpacing: 0.2 };
    const prefixStyle = { opacity: 0.9 };
    const onPress = vi.fn();
    const chip = Chip({
      disabled: true,
      label: "setup",
      onPress,
      prefix: "+ 저장",
      prefixStyle,
      style: customStyle,
      labelStyle,
      testID: "suggestion-chip",
    }) as ReactElement<{
      accessibilityRole: string;
      accessibilityState: { disabled?: boolean };
      children: ReactNode;
      disabled: boolean;
      onPress: typeof onPress;
      style: (state: { pressed: boolean }) => unknown[];
      testID: string;
    }>;
    const children = Children.toArray(chip.props.children) as ReactElement<{
      children?: ReactNode;
      style: unknown[];
    }>[];

    expect(chip.type).toBe(nativeMocks.Pressable);
    expect(chip.props.accessibilityRole).toBe("button");
    expect(chip.props.accessibilityState.disabled).toBe(true);
    expect(chip.props.disabled).toBe(true);
    expect(chip.props.onPress).toBe(onPress);
    expect(chip.props.testID).toBe("suggestion-chip");
    expect(chip.props.style({ pressed: true })).toEqual([
      expect.objectContaining({ opacity: 0.64 }),
      null,
      customStyle,
    ]);
    expect(children[0]?.type).toBe(nativeMocks.Text);
    expect(children[0]?.props.children).toBe("+ 저장");
    expect(children[0]?.props.style).toEqual([
      expect.objectContaining({
        color: nativeTokens.component.chip.prefix,
        fontSize: nativeTokens.typography.text.size.xs,
        fontWeight: "800",
      }),
      prefixStyle,
    ]);
    expect(children[1]?.type).toBe(nativeMocks.Text);
    expect(children[1]?.props.children).toBe("setup");
    expect(children[1]?.props.style).toEqual([
      expect.objectContaining({
        color: nativeTokens.component.chip.foreground,
        fontSize: nativeTokens.typography.text.size.sm,
      }),
      labelStyle,
    ]);
  });

  it("adds pressed feedback for enabled Chip while preserving caller style callbacks", () => {
    const idleStyle = { borderWidth: 1 };
    const pressedStyle = { borderWidth: 2 };
    const style = vi.fn(({ pressed }: { pressed: boolean }) =>
      pressed ? pressedStyle : idleStyle,
    );
    const chip = Chip({
      label: "long term · detailed meaning",
      style,
    }) as ReactElement<{
      style: (state: { pressed: boolean }) => unknown[];
    }>;

    expect(chip.props.style({ pressed: false })).toEqual([
      expect.objectContaining({ opacity: 1 }),
      null,
      idleStyle,
    ]);
    expect(chip.props.style({ pressed: true })).toEqual([
      expect.objectContaining({ opacity: 1 }),
      buttonPressedStyle,
      pressedStyle,
    ]);
    expect(style).toHaveBeenNthCalledWith(1, { pressed: false });
    expect(style).toHaveBeenNthCalledWith(2, { pressed: true });
  });

  it("maps Chip styles to native component tokens without adding state tokens yet", () => {
    expect(createChipStyle({ disabled: true })).toMatchObject({
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: nativeTokens.component.chip.background,
      borderColor: nativeTokens.component.chip.border,
      borderRadius: nativeTokens.component.chip.radius,
      borderWidth: 1,
      flexDirection: "row",
      gap: nativeTokens.component.chip.gap,
      maxWidth: "100%",
      minHeight: nativeTokens.component.chip.minHeight,
      minWidth: 0,
      opacity: 0.64,
      paddingHorizontal: nativeTokens.component.chip.paddingX,
      paddingVertical: nativeTokens.component.chip.paddingY,
    });

    expect(createChipLabelStyle()).toMatchObject({
      color: nativeTokens.component.chip.foreground,
      flexShrink: 1,
      fontSize: nativeTokens.typography.text.size.sm,
      fontWeight: "700",
      lineHeight: nativeTokens.typography.text.lineHeight.sm,
      minWidth: 0,
    });
    expect(createChipPrefixStyle()).toMatchObject({
      color: nativeTokens.component.chip.prefix,
      fontSize: nativeTokens.typography.text.size.xs,
      fontWeight: "800",
      lineHeight: nativeTokens.typography.text.lineHeight.xs,
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
