import { useRef, useState } from "react";
import type { ElementRef } from "react";
import {
  Modal,
  Pressable,
  Text,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Card } from "@nado/ui/native";
import type { MobileVocabularyItem } from "../../api/analysisApi";
import type { MobileVocabularyActions } from "../vocabulary/useMobileVocabulary";
import {
  readSuggestionSaveActionLabel,
  readSuggestionSaveActionText,
} from "../vocabulary/mobileSuggestionSavePresentation";
import {
  MOBILE_WORD_POPOVER_DEFAULT_HEIGHT,
  MOBILE_WORD_POPOVER_DEFAULT_WIDTH,
  getMobileWordPopoverPosition,
  type MobileWordPopoverRect,
  type MobileWordPopoverSize,
} from "./wordPopoverPlacement";
import { styles } from "../../styles/mobileStyles";

export type MobileVocabularyPopoverSelection = {
  item: MobileVocabularyItem;
  triggerRect: MobileWordPopoverRect;
};

export type MobileVocabularySelectionHandler = (
  selection: MobileVocabularyPopoverSelection | null,
) => void;

export function MobileVocabularyWordPopover({
  getSuggestionState,
  onClose,
  onSaveSuggestion,
  selection,
}: {
  getSuggestionState: MobileVocabularyActions["getSuggestionState"];
  onClose: () => void;
  onSaveSuggestion: MobileVocabularyActions["saveSuggestion"];
  selection: MobileVocabularyPopoverSelection;
}) {
  const [popoverSize, setPopoverSize] = useState<MobileWordPopoverSize>({
    height: MOBILE_WORD_POPOVER_DEFAULT_HEIGHT,
    width: MOBILE_WORD_POPOVER_DEFAULT_WIDTH,
  });
  const viewportSize = useWindowDimensions();
  const popoverPosition = getMobileWordPopoverPosition({
    popoverSize,
    triggerRect: selection.triggerRect,
    viewportSize,
  });

  const handlePopoverLayout = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    const nextSize = {
      height: Math.max(1, Math.round(height)),
      width: Math.max(1, Math.round(width)),
    };

    if (
      nextSize.height === Math.round(popoverSize.height) &&
      nextSize.width === Math.round(popoverSize.width)
    ) {
      return;
    }

    setPopoverSize(nextSize);
  };

  return (
    <Modal animationType="none" onRequestClose={onClose} transparent visible>
      <View pointerEvents="box-none" style={styles.wordPopoverOverlay}>
        <Pressable
          accessibilityLabel="단어 뜻 닫기"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.wordPopoverDismissLayer}
        />
        <MobileVocabularyWordCard
          getSuggestionState={getSuggestionState}
          item={selection.item}
          onLayout={handlePopoverLayout}
          onSaveSuggestion={onSaveSuggestion}
          style={[
            styles.wordDefinitionPopoverCard,
            {
              left: popoverPosition.left,
              maxHeight: popoverPosition.height,
              top: popoverPosition.top,
              width: popoverPosition.width,
            },
          ]}
        />
      </View>
    </Modal>
  );
}

export function MobileVocabularyWordToken({
  accessibilityLabel,
  isSelected,
  item,
  onSelectVocabulary,
  text,
}: {
  accessibilityLabel: string;
  isSelected: boolean;
  item: MobileVocabularyItem;
  onSelectVocabulary: MobileVocabularySelectionHandler;
  text: string;
}) {
  const tokenRef = useRef<ElementRef<typeof Pressable>>(null);

  const handlePress = (event: GestureResponderEvent) => {
    if (isSelected) {
      onSelectVocabulary(null);
      return;
    }

    const fallbackRect = {
      height: 28,
      width: Math.max(24, text.length * 12),
      x: Math.max(0, event.nativeEvent.pageX - 12),
      y: Math.max(0, event.nativeEvent.pageY - 14),
    };
    const token = tokenRef.current as {
      measureInWindow?: (
        callback: (x: number, y: number, width: number, height: number) => void,
      ) => void;
    } | null;

    if (typeof token?.measureInWindow === "function") {
      token.measureInWindow((x, y, width, height) => {
        onSelectVocabulary({
          item,
          triggerRect:
            width > 0 && height > 0 ? { height, width, x, y } : fallbackRect,
        });
      });
      return;
    }

    onSelectVocabulary({ item, triggerRect: fallbackRect });
  };

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ expanded: isSelected }}
      onPress={handlePress}
      ref={tokenRef}
      style={({ pressed }) => [
        styles.wordToken,
        isSelected ? styles.wordTokenActive : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text style={styles.chunkEnglish}>{text}</Text>
    </Pressable>
  );
}

function MobileVocabularyWordCard({
  getSuggestionState,
  item,
  onLayout,
  onSaveSuggestion,
  style,
}: {
  getSuggestionState: MobileVocabularyActions["getSuggestionState"];
  item: MobileVocabularyItem;
  onLayout?: (event: LayoutChangeEvent) => void;
  onSaveSuggestion: MobileVocabularyActions["saveSuggestion"];
  style?: StyleProp<ViewStyle>;
}) {
  const suggestionState = getSuggestionState(item);
  const isSaveDisabled = suggestionState !== "idle";

  return (
    <Card
      accessibilityLabel={`${item.term} 뜻과 저장 액션`}
      onLayout={onLayout}
      padding="lg"
      radius="md"
      style={[styles.wordDefinitionCard, style]}
      tone="elevated"
    >
      <View style={styles.wordDefinitionHeader}>
        <Text style={styles.wordDefinitionTerm}>{item.term}</Text>
        {item.partOfSpeech ? (
          <Text style={styles.wordDefinitionPartOfSpeech}>
            {item.partOfSpeech}
          </Text>
        ) : null}
      </View>
      <Text style={styles.wordDefinitionMeaning}>{item.meaning}</Text>
      <Text style={styles.wordDefinitionContext}>{item.contextMeaning}</Text>
      <Pressable
        accessibilityLabel={readSuggestionSaveActionLabel(
          item.term,
          item.meaning,
          suggestionState,
        )}
        accessibilityRole="button"
        accessibilityState={{ disabled: isSaveDisabled }}
        disabled={isSaveDisabled}
        onPress={() => {
          void onSaveSuggestion(item);
        }}
        style={({ pressed }) => [
          styles.wordDefinitionSaveButton,
          isSaveDisabled ? styles.wordDefinitionSaveButtonDisabled : null,
          pressed && !isSaveDisabled ? styles.pressed : null,
        ]}
      >
        <Text style={styles.wordDefinitionSaveButtonText}>
          {readSuggestionSaveActionText(suggestionState)}
        </Text>
      </Pressable>
    </Card>
  );
}
