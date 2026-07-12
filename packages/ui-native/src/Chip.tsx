import {
  Pressable,
  Text as NativeText,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type TextStyle,
} from "react-native";
import {
  buttonPressedStyle,
  createChipLabelStyle,
  createChipPrefixStyle,
  createChipStyle,
} from "./styles";

export interface ChipProps extends Omit<
  PressableProps,
  "children" | "disabled" | "style"
> {
  disabled?: boolean;
  label: string;
  labelStyle?: StyleProp<TextStyle>;
  prefix?: string;
  prefixStyle?: StyleProp<TextStyle>;
  style?: PressableProps["style"];
}

export function Chip({
  accessibilityState,
  disabled,
  label,
  labelStyle,
  prefix,
  prefixStyle,
  style,
  ...props
}: ChipProps) {
  const isDisabled = Boolean(disabled);
  const chipStyle = createChipStyle({ disabled: isDisabled });
  const resolveStyle = (state: PressableStateCallbackType) => [
    chipStyle,
    state.pressed && !isDisabled ? buttonPressedStyle : null,
    typeof style === "function" ? style(state) : style,
  ];

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityState={{
        ...accessibilityState,
        disabled: isDisabled || accessibilityState?.disabled,
      }}
      disabled={isDisabled}
      style={resolveStyle}
    >
      {prefix ? (
        <NativeText style={[createChipPrefixStyle(), prefixStyle]}>
          {prefix}
        </NativeText>
      ) : null}
      <NativeText style={[createChipLabelStyle(), labelStyle]}>
        {label}
      </NativeText>
    </Pressable>
  );
}
