import type { ReactNode } from "react";
import {
  Text as NativeText,
  type StyleProp,
  type TextProps as NativeTextProps,
  type TextStyle,
} from "react-native";
import {
  createTextStyle,
  type TextAlign,
  type TextSize,
  type TextTone,
  type TextWeight,
} from "./styles";

export type { TextAlign, TextSize, TextTone, TextWeight } from "./styles";

export interface TextProps extends Omit<NativeTextProps, "children" | "style"> {
  align?: TextAlign;
  children: ReactNode;
  size?: TextSize;
  style?: StyleProp<TextStyle>;
  tone?: TextTone;
  weight?: TextWeight;
}

export function Text({
  align = "start",
  children,
  size = "md",
  style,
  tone = "default",
  weight = "regular",
  ...props
}: TextProps) {
  return (
    <NativeText
      style={[createTextStyle({ align, size, tone, weight }), style]}
      {...props}
    >
      {children}
    </NativeText>
  );
}
