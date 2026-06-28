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
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import {
  createBadgeStyle,
  createBadgeTextStyle,
  type BadgeSize,
  type BadgeTone,
} from "./styles";

export type { BadgeSize, BadgeTone } from "./styles";

export interface BadgeProps extends Omit<ViewProps, "children" | "style"> {
  children: ReactNode;
  size?: BadgeSize;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  tone?: BadgeTone;
}

export function Badge({
  children,
  size = "sm",
  style,
  textStyle,
  tone = "neutral",
  ...props
}: BadgeProps) {
  return (
    <View style={[createBadgeStyle({ size, tone }), style]} {...props}>
      {renderBadgeChildren(children, { size, textStyle, tone })}
    </View>
  );
}

interface RenderBadgeChildrenOptions {
  size: BadgeSize;
  textStyle?: StyleProp<TextStyle>;
  tone: BadgeTone;
}

function renderBadgeChildren(
  children: ReactNode,
  options: RenderBadgeChildrenOptions,
): ReactNode {
  if (isTextChild(children)) {
    return (
      <NativeText
        style={[
          createBadgeTextStyle({ size: options.size, tone: options.tone }),
          options.textStyle,
        ]}
      >
        {children}
      </NativeText>
    );
  }

  if (isFragmentElement(children)) {
    return (
      <Fragment>
        {renderBadgeChildren(children.props.children, options)}
      </Fragment>
    );
  }

  if (isValidElement(children)) {
    return children;
  }

  return Children.map(children, (child) => renderBadgeChildren(child, options));
}

function isTextChild(child: ReactNode) {
  return typeof child === "string" || typeof child === "number";
}

function isFragmentElement(
  child: ReactNode,
): child is ReactElement<{ children?: ReactNode }, typeof Fragment> {
  return isValidElement(child) && child.type === Fragment;
}
