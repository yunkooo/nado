import type { ReactNode } from "react";
import {
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import {
  createStackStyle,
  type StackAlign,
  type StackDirection,
  type StackGap,
} from "./styles";

export type { StackAlign, StackDirection, StackGap } from "./styles";

export interface StackProps extends Omit<ViewProps, "children" | "style"> {
  align?: StackAlign;
  children: ReactNode;
  direction?: StackDirection;
  gap?: StackGap;
  style?: StyleProp<ViewStyle>;
}

export function Stack({
  align = "stretch",
  children,
  direction = "vertical",
  gap = "md",
  style,
  ...props
}: StackProps) {
  return (
    <View
      style={[createStackStyle({ align, direction, gap }), style]}
      {...props}
    >
      {children}
    </View>
  );
}
