import { describe, expect, it } from "vitest";
import type {
  BadgeProps as WebBadgeProps,
  BadgeSize as WebBadgeSize,
  BadgeTone as WebBadgeTone,
  ButtonProps as WebButtonProps,
  ButtonSize as WebButtonSize,
  ButtonVariant as WebButtonVariant,
  CardPadding as WebCardPadding,
  CardProps as WebCardProps,
  CardRadius as WebCardRadius,
  CardTone as WebCardTone,
  ChipProps as WebChipProps,
  StackAlign as WebStackAlign,
  StackDirection as WebStackDirection,
  StackGap as WebStackGap,
  StackProps as WebStackProps,
  TextAlign as WebTextAlign,
  TextProps as WebTextProps,
  TextSize as WebTextSize,
  TextTone as WebTextTone,
  TextWeight as WebTextWeight,
} from "@nado/ui-web";
import type {
  BadgeProps as NativeBadgeProps,
  BadgeSize as NativeBadgeSize,
  BadgeTone as NativeBadgeTone,
  ButtonProps as NativeButtonProps,
  ButtonSize as NativeButtonSize,
  ButtonVariant as NativeButtonVariant,
  CardPadding as NativeCardPadding,
  CardProps as NativeCardProps,
  CardRadius as NativeCardRadius,
  CardTone as NativeCardTone,
  ChipProps as NativeChipProps,
  StackAlign as NativeStackAlign,
  StackDirection as NativeStackDirection,
  StackGap as NativeStackGap,
  StackProps as NativeStackProps,
  TextAlign as NativeTextAlign,
  TextProps as NativeTextProps,
  TextSize as NativeTextSize,
  TextTone as NativeTextTone,
  TextWeight as NativeTextWeight,
} from "@nado/ui-native";

type Equal<TLeft, TRight> =
  (<T>() => T extends TLeft ? 1 : 2) extends <T>() => T extends TRight ? 1 : 2
    ? true
    : false;
type Assert<TValue extends true> = TValue;

export type PlatformContractAssertions = [
  Assert<Equal<WebButtonVariant, NativeButtonVariant>>,
  Assert<Equal<WebButtonSize, NativeButtonSize>>,
  Assert<Equal<WebBadgeTone, NativeBadgeTone>>,
  Assert<Equal<WebBadgeSize, NativeBadgeSize>>,
  Assert<Equal<WebCardPadding, NativeCardPadding>>,
  Assert<Equal<WebCardRadius, NativeCardRadius>>,
  Assert<Equal<WebCardTone, NativeCardTone>>,
  Assert<Equal<WebTextSize, NativeTextSize>>,
  Assert<Equal<WebTextWeight, NativeTextWeight>>,
  Assert<Equal<WebTextTone, NativeTextTone>>,
  Assert<Equal<WebTextAlign, NativeTextAlign>>,
  Assert<Equal<WebStackGap, NativeStackGap>>,
  Assert<Equal<WebStackDirection, NativeStackDirection>>,
  Assert<Equal<WebStackAlign, NativeStackAlign>>,
  Assert<Equal<WebButtonProps["isLoading"], NativeButtonProps["isLoading"]>>,
  Assert<Equal<WebButtonProps["disabled"], NativeButtonProps["disabled"]>>,
  Assert<Equal<WebBadgeProps["size"], NativeBadgeProps["size"]>>,
  Assert<Equal<WebBadgeProps["tone"], NativeBadgeProps["tone"]>>,
  Assert<Equal<WebCardProps["padding"], NativeCardProps["padding"]>>,
  Assert<Equal<WebCardProps["radius"], NativeCardProps["radius"]>>,
  Assert<Equal<WebCardProps["tone"], NativeCardProps["tone"]>>,
  Assert<Equal<WebChipProps["label"], NativeChipProps["label"]>>,
  Assert<Equal<WebChipProps["prefix"], NativeChipProps["prefix"]>>,
  Assert<Equal<WebChipProps["disabled"], NativeChipProps["disabled"]>>,
  Assert<Equal<WebTextProps["size"], NativeTextProps["size"]>>,
  Assert<Equal<WebTextProps["weight"], NativeTextProps["weight"]>>,
  Assert<Equal<WebTextProps["tone"], NativeTextProps["tone"]>>,
  Assert<Equal<WebTextProps["align"], NativeTextProps["align"]>>,
  Assert<Equal<WebStackProps["gap"], NativeStackProps["gap"]>>,
  Assert<Equal<WebStackProps["direction"], NativeStackProps["direction"]>>,
  Assert<Equal<WebStackProps["align"], NativeStackProps["align"]>>,
];

describe("Web and Native public component contracts", () => {
  it("keeps compile-time assertions in the facade package typecheck", () => {
    expect(true).toBe(true);
  });
});
