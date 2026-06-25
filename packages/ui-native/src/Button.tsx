import type { ReactNode } from "react";
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
      <NativeText style={[createButtonTextStyle({ variant }), textStyle]}>
        {isLoading ? "Loading" : children}
      </NativeText>
    </Pressable>
  );
}
