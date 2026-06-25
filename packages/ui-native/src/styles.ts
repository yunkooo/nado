import { nativeTokens } from "@nado/tokens/react-native";
import type { TextStyle, ViewStyle } from "react-native";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "send";
export type ButtonSize = "sm" | "md" | "icon";

export type TextSize = "xs" | "sm" | "md" | "lg" | "xl";
export type TextWeight = "regular" | "medium" | "bold" | "heavy";
export type TextTone = "default" | "muted" | "primary" | "danger";
export type TextAlign = "start" | "center" | "end";

export type StackGap = "xs" | "sm" | "md" | "lg" | "xl";
export type StackDirection = "vertical" | "horizontal";
export type StackAlign = "start" | "center" | "end" | "stretch";

type CreateButtonStyleOptions = {
  disabled?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

type CreateButtonTextStyleOptions = {
  variant?: ButtonVariant;
};

type CreateTextStyleOptions = {
  align?: TextAlign;
  size?: TextSize;
  tone?: TextTone;
  weight?: TextWeight;
};

type CreateStackStyleOptions = {
  align?: StackAlign;
  direction?: StackDirection;
  gap?: StackGap;
};

export const buttonPressedStyle = {
  opacity: 0.72,
} satisfies ViewStyle;

export function createButtonStyle({
  disabled = false,
  size = "md",
  variant = "primary",
}: CreateButtonStyleOptions = {}) {
  const variantTokens = nativeTokens.component.button[variant];
  const sizeTokens = nativeTokens.component.button.size[size];
  const borderStyle =
    "border" in variantTokens
      ? {
          borderColor: variantTokens.border,
          borderWidth: 1,
        }
      : {};
  const iconSizeStyle =
    size === "icon"
      ? {
          height: nativeTokens.component.button.size.icon.height,
          minWidth: nativeTokens.component.button.size.icon.width,
          width: nativeTokens.component.button.size.icon.width,
        }
      : {};

  return {
    alignItems: "center",
    backgroundColor: variantTokens.background,
    borderRadius:
      size === "icon"
        ? nativeTokens.component.button.size.icon.radius
        : nativeTokens.component.button.radius,
    justifyContent: "center",
    minHeight: sizeTokens.height,
    opacity: disabled ? 0.64 : 1,
    paddingHorizontal: sizeTokens.paddingX,
    ...borderStyle,
    ...iconSizeStyle,
  } satisfies ViewStyle;
}

export function createButtonTextStyle({
  variant = "primary",
}: CreateButtonTextStyleOptions = {}) {
  const variantTokens = nativeTokens.component.button[variant];

  return {
    color: variantTokens.foreground,
    fontSize: nativeTokens.typography.text.size.sm,
    fontWeight: toNativeFontWeight(nativeTokens.typography.text.weight.heavy),
    lineHeight: nativeTokens.typography.text.lineHeight.sm,
    textAlign: "center",
  } satisfies TextStyle;
}

export function createTextStyle({
  align = "start",
  size = "md",
  tone = "default",
  weight = "regular",
}: CreateTextStyleOptions = {}) {
  return {
    color: textToneColor[tone],
    fontSize: nativeTokens.typography.text.size[size],
    fontWeight: toNativeFontWeight(nativeTokens.typography.text.weight[weight]),
    lineHeight: nativeTokens.typography.text.lineHeight[size],
    textAlign: textAlignValue[align],
  } satisfies TextStyle;
}

export function createStackStyle({
  align = "stretch",
  direction = "vertical",
  gap = "md",
}: CreateStackStyleOptions = {}) {
  return {
    alignItems: stackAlignValue[align],
    flexDirection: direction === "horizontal" ? "row" : "column",
    gap: nativeTokens.spacing[gap],
  } satisfies ViewStyle;
}

const textToneColor = {
  danger: nativeTokens.color.accent,
  default: nativeTokens.color.ink,
  muted: nativeTokens.color.inkMuted,
  primary: nativeTokens.color.primary,
} satisfies Record<TextTone, string>;

const textAlignValue = {
  center: "center",
  end: "right",
  start: "left",
} satisfies Record<TextAlign, NonNullable<TextStyle["textAlign"]>>;

const stackAlignValue = {
  center: "center",
  end: "flex-end",
  start: "flex-start",
  stretch: "stretch",
} satisfies Record<StackAlign, NonNullable<ViewStyle["alignItems"]>>;

function toNativeFontWeight(value: number) {
  return String(value) as TextStyle["fontWeight"];
}
