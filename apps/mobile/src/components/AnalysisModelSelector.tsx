import { Modal, Pressable, Text, View } from "react-native";
import {
  ANALYSIS_MODELS,
  type AnalysisModelId,
} from "@nado/shared/analysis-input";
import { styles } from "../styles/mobileStyles";

export function AnalysisModelSelector({
  onClose,
  onSelect,
  selectedModel,
  visible,
}: {
  onClose: () => void;
  onSelect: (modelId: AnalysisModelId) => void;
  selectedModel: AnalysisModelId;
  visible: boolean;
}) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modelSelectorOverlay}>
        <Pressable
          accessibilityLabel="AI 모델 선택 닫기"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.modelSelectorDismissLayer}
        />
        <View accessibilityRole="menu" style={styles.modelSelectorCard}>
          {ANALYSIS_MODELS.map((model) => {
            const selected = model.id === selectedModel;

            return (
              <Pressable
                accessibilityRole="menuitem"
                accessibilityState={{ selected }}
                key={model.id}
                onPress={() => onSelect(model.id)}
                style={({ pressed }) => [
                  styles.modelSelectorOption,
                  selected ? styles.modelSelectorOptionActive : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text
                  style={[
                    styles.modelSelectorOptionText,
                    selected ? styles.modelSelectorOptionTextActive : null,
                  ]}
                >
                  {model.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}
