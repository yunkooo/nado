import {
  Children,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  Pressable,
  Text as NativeText,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import {
  buttonPressedStyle,
  createButtonStyle,
  createButtonTextStyle,
  type ButtonSize,
  type ButtonVariant,
} from "./styles";

export type { ButtonSize, ButtonVariant } from "./styles";

export interface ButtonProps extends Omit<
  PressableProps,
  "children" | "style"
> {
  children: ReactNode;
  isLoading?: boolean;
  size?: ButtonSize;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  variant?: ButtonVariant;
}

export function Button({
  accessibilityState,
  children,
  disabled,
  isLoading = false,
  size = "md",
  style,
  textStyle,
  variant = "primary",
  ...props
}: ButtonProps) {
  const isDisabled = Boolean(disabled || isLoading);
  const buttonContent = isLoading ? "Loading" : children;

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityState={{
        ...accessibilityState,
        busy: isLoading || accessibilityState?.busy,
        disabled: isDisabled || accessibilityState?.disabled,
      }}
      disabled={isDisabled}
      style={({ pressed }) => [
        createButtonStyle({ disabled: isDisabled, size, variant }),
        pressed && !isDisabled ? buttonPressedStyle : null,
        style,
      ]}
    >
      {renderButtonContent(buttonContent, {
        textStyle,
        variant,
      })}
    </Pressable>
  );
}

interface RenderButtonContentOptions {
  textStyle?: StyleProp<TextStyle>;
  variant: ButtonVariant;
}

function renderButtonContent(
  children: ReactNode,
  options: RenderButtonContentOptions,
): ReactNode {
  if (!hasTextChild(children)) {
    return children;
  }

  return renderTextChildren(children, options);
}

function renderTextChildren(
  children: ReactNode,
  { textStyle, variant }: RenderButtonContentOptions,
): ReactNode {
  if (isTextChild(children)) {
    return (
      <NativeText style={[createButtonTextStyle({ variant }), textStyle]}>
        {children}
      </NativeText>
    );
  }

  if (isFragmentElement(children)) {
    return (
      <Fragment>
        {renderTextChildren(children.props.children, { textStyle, variant })}
      </Fragment>
    );
  }

  if (isValidElement(children)) {
    return children;
  }

  return Children.map(children, (child) =>
    renderTextChildren(child, { textStyle, variant }),
  );
}

function hasTextChild(children: ReactNode): boolean {
  return (
    isTextChild(children) ||
    Children.toArray(children).some(
      (child) =>
        isTextChild(child) ||
        (isFragmentElement(child) && hasTextChild(child.props.children)),
    )
  );
}

function isTextChild(child: ReactNode) {
  return typeof child === "string" || typeof child === "number";
}

function isFragmentElement(
  child: ReactNode,
): child is ReactElement<{ children?: ReactNode }, typeof Fragment> {
  return isValidElement(child) && child.type === Fragment;
}
