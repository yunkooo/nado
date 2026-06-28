import {
  Pressable,
  Text as NativeText,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import {
  createChipLabelStyle,
  createChipPrefixStyle,
  createChipStyle,
} from "./styles";

export interface ChipProps extends Omit<PressableProps, "children" | "style"> {
  label: string;
  labelStyle?: StyleProp<TextStyle>;
  prefix?: string;
  prefixStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
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

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityState={{
        ...accessibilityState,
        disabled: isDisabled || accessibilityState?.disabled,
      }}
      disabled={isDisabled}
      style={[createChipStyle({ disabled: isDisabled }), style]}
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
