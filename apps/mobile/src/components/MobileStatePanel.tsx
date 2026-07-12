import { Text, View } from "react-native";
import {
  getMobileStatePanelCopy,
  type MobilePanelState,
  type MobilePanelType,
} from "./mobilePanelState";
import { styles } from "../styles/mobileStyles";

export function MobileStatePanel({
  message,
  state,
  type,
}: {
  message: string | null;
  state: Exclude<MobilePanelState, "list">;
  type: MobilePanelType;
}) {
  const copy = getMobileStatePanelCopy(type, state, message);

  return (
    <View
      accessibilityRole={state === "error" ? "alert" : undefined}
      style={styles.emptyPanel}
    >
      <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
      <Text style={styles.emptyPanelTitle}>{copy.title}</Text>
      <Text style={styles.emptyPanelText}>{copy.message}</Text>
    </View>
  );
}
