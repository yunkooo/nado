import { nativeTokens } from "@nado/tokens/react-native";
import type { TextStyle, ViewStyle } from "react-native";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "send";
export type ButtonSize = "sm" | "md" | "icon";

export type CardPadding = "sm" | "md" | "lg" | "xl";
export type CardTone = "surface" | "muted" | "elevated";
export type CardRadius = "sm" | "md" | "composer";

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

type CreateCardStyleOptions = {
  padding?: CardPadding;
  radius?: CardRadius;
  tone?: CardTone;
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

export function createCardStyle({
  padding = "md",
  radius = "md",
  tone = "surface",
}: CreateCardStyleOptions = {}) {
  return {
    backgroundColor: cardToneBackground[tone],
    borderColor: nativeTokens.color.border,
    borderRadius: nativeTokens.radius[radius],
    borderWidth: 1,
    padding: nativeTokens.spacing[padding],
    ...(tone === "elevated" ? elevatedCardStyle : {}),
  } satisfies ViewStyle;
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

const cardToneBackground = {
  elevated: nativeTokens.color.surface,
  muted: nativeTokens.color.surfaceMuted,
  surface: nativeTokens.color.surface,
} satisfies Record<CardTone, string>;

const elevatedCardStyle = {
  elevation: 4,
  shadowColor: nativeTokens.color.ink,
  shadowOffset: {
    height: 10,
    width: 0,
  },
  shadowOpacity: 0.08,
  shadowRadius: 18,
} satisfies ViewStyle;

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
