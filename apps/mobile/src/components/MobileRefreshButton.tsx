import { Pressable, Text } from "react-native";
import { styles } from "../styles/mobileStyles";

export function MobileRefreshButton({
  accessibilityLabel,
  isDisabled,
  isRefreshing,
  onRefresh,
}: {
  accessibilityLabel: string;
  isDisabled: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ busy: isRefreshing, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onRefresh}
      style={({ pressed }) => [
        styles.refreshButton,
        isDisabled ? styles.refreshButtonDisabled : null,
        pressed && !isDisabled ? styles.pressed : null,
      ]}
    >
      <Text style={styles.refreshButtonIcon}>↻</Text>
    </Pressable>
  );
}
