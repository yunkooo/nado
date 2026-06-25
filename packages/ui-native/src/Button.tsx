import { Children, type ReactNode } from "react";
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
  const shouldRenderTextLabel = isTextButtonLabel(buttonContent);

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
      {shouldRenderTextLabel ? (
        <NativeText style={[createButtonTextStyle({ variant }), textStyle]}>
          {buttonContent}
        </NativeText>
      ) : (
        buttonContent
      )}
    </Pressable>
  );
}

function isTextButtonLabel(children: ReactNode) {
  const normalizedChildren = Children.toArray(children);

  return (
    normalizedChildren.length > 0 &&
    normalizedChildren.every(
      (child) => typeof child === "string" || typeof child === "number",
    )
  );
}
