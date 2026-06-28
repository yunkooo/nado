import {
  Children,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  Text as NativeText,
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
      {renderCardChildren(children)}
    </View>
  );
}

function renderCardChildren(children: ReactNode): ReactNode {
  if (isTextChild(children)) {
    return <NativeText>{children}</NativeText>;
  }

  if (isFragmentElement(children)) {
    return <Fragment>{renderCardChildren(children.props.children)}</Fragment>;
  }

  if (isValidElement(children)) {
    return children;
  }

  return Children.map(children, renderCardChildren);
}

function isTextChild(child: ReactNode) {
  return typeof child === "string" || typeof child === "number";
}

function isFragmentElement(
  child: ReactNode,
): child is ReactElement<{ children?: ReactNode }, typeof Fragment> {
  return isValidElement(child) && child.type === Fragment;
}
