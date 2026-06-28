import type { ReactNode } from "react";
import {
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import {
  createCardStyle,
  type CardPadding,
  type CardRadius,
  type CardTone,
} from "./styles";

export type { CardPadding, CardRadius, CardTone } from "./styles";

export interface CardProps extends Omit<ViewProps, "children" | "style"> {
  children: ReactNode;
  padding?: CardPadding;
  radius?: CardRadius;
  style?: StyleProp<ViewStyle>;
  tone?: CardTone;
}

export function Card({
  children,
  padding = "md",
  radius = "md",
  style,
  tone = "surface",
  ...props
}: CardProps) {
  return (
    <View
      style={[createCardStyle({ padding, radius, tone }), style]}
      {...props}
    >
      {children}
    </View>
  );
}
