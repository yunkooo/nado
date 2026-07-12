import { View } from "react-native";
import { Chip } from "@nado/ui/native";
import type { MobileVocabularySuggestion } from "../api/analysisApi";
import {
  readSuggestionSaveActionLabel,
  readSuggestionSavePrefix,
} from "../features/vocabulary/mobileSuggestionSavePresentation";
import type { MobileVocabularyActions } from "../features/vocabulary/useMobileVocabulary";
import { styles } from "../styles/mobileStyles";

export function MobileVocabularySuggestionList({
  getSuggestionState,
  onSaveSuggestion,
  suggestions,
}: {
  getSuggestionState: MobileVocabularyActions["getSuggestionState"];
  onSaveSuggestion: MobileVocabularyActions["saveSuggestion"];
  suggestions: MobileVocabularySuggestion[];
}) {
  return (
    <View style={styles.suggestionList}>
      {suggestions.map((suggestion) => {
        const suggestionState = getSuggestionState(suggestion);
        const isSavingDisabled = suggestionState !== "idle";

        return (
          <Chip
            accessibilityLabel={readSuggestionSaveActionLabel(
              suggestion.term,
              suggestion.meaning,
              suggestionState,
            )}
            accessibilityState={{ disabled: isSavingDisabled }}
            disabled={isSavingDisabled}
            key={`${suggestion.term}-${suggestion.meaning}-${suggestion.note ?? ""}`}
            label={`${suggestion.term} · ${suggestion.meaning}`}
            onPress={() => {
              void onSaveSuggestion(suggestion);
            }}
            prefix={readSuggestionSavePrefix(suggestionState)}
            style={[
              suggestionState === "saved" ? styles.suggestionChipSaved : null,
              suggestionState === "saving" ? styles.suggestionChipSaving : null,
            ]}
          />
        );
      })}
    </View>
  );
}
