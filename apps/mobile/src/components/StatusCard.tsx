import { Text, View } from "react-native";
import { styles } from "../styles/mobileStyles";

export function StatusCard({
  message,
  title,
  tone = "neutral",
}: {
  message: string;
  title: string | null;
  tone?: "error" | "neutral";
}) {
  return (
    <View
      accessibilityRole={tone === "error" ? "alert" : undefined}
      style={styles.statusCard}
    >
      {title ? <Text style={styles.statusTitle}>{title}</Text> : null}
      <Text style={styles.statusText}>{message}</Text>
    </View>
  );
}
