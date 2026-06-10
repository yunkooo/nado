import type { VocabularySuggestion } from "@nado/ui";

export function createVocabularySuggestionKey(
  suggestion: VocabularySuggestion,
) {
  return `${suggestion.type}:${suggestion.term}:${suggestion.meaning}`;
}
