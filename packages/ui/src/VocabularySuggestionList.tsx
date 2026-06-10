import { Chip } from "./Chip";
import type {
  VocabularySuggestion,
  VocabularySuggestionSaveState,
} from "./analysisTypes";

export interface VocabularySuggestionListProps {
  getSuggestionState?: (
    suggestion: VocabularySuggestion,
  ) => VocabularySuggestionSaveState;
  onSaveSuggestion?: (suggestion: VocabularySuggestion) => void;
  suggestions: VocabularySuggestion[];
}

export function VocabularySuggestionList({
  getSuggestionState,
  onSaveSuggestion,
  suggestions,
}: VocabularySuggestionListProps) {
  const isInteractive = Boolean(onSaveSuggestion);

  return (
    <div className="nado-vocabulary-list">
      {suggestions.map((suggestion) => {
        const state = getSuggestionState?.(suggestion) ?? "idle";

        return (
          <Chip
            aria-label={getSuggestionAriaLabel(
              suggestion,
              state,
              isInteractive,
            )}
            as={isInteractive ? "button" : "span"}
            disabled={isInteractive ? state !== "idle" : undefined}
            key={`${suggestion.term}-${suggestion.meaning}`}
            label={`${suggestion.term} · ${suggestion.meaning}`}
            onClick={
              onSaveSuggestion ? () => onSaveSuggestion(suggestion) : undefined
            }
            prefix={isInteractive ? getSavePrefix(state) : "+"}
          />
        );
      })}
    </div>
  );
}

function getSuggestionAriaLabel(
  suggestion: VocabularySuggestion,
  state: VocabularySuggestionSaveState,
  isInteractive: boolean,
) {
  const label = `${suggestion.term}: ${suggestion.meaning}`;

  if (!isInteractive) {
    return label;
  }

  if (state === "saving") {
    return `${label} 저장 중`;
  }

  if (state === "saved") {
    return `${label} 저장됨`;
  }

  return `${label} 저장`;
}

function getSavePrefix(state: VocabularySuggestionSaveState) {
  if (state === "saving") {
    return "저장 중";
  }

  if (state === "saved") {
    return "저장됨";
  }

  return "+";
}
