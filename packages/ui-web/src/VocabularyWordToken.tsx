import type {
  VocabularyItem,
  VocabularySuggestion,
  VocabularySuggestionSaveState,
} from "./analysisTypes";
import { VocabularyWordPopover } from "./VocabularyWordPopover";
import { useVocabularyWordPopover } from "./useVocabularyWordPopover";

export {
  getClampedWordPopoverPosition,
  type WordPopoverPlacement,
  type WordPopoverPosition,
  type WordPopoverPositionOptions,
} from "./wordPopoverPosition";

export interface VocabularyWordTokenProps {
  getVocabularySuggestionState?: (
    suggestion: VocabularySuggestion,
  ) => VocabularySuggestionSaveState;
  isOpen?: boolean;
  item: VocabularyItem;
  onSaveVocabularySuggestion?: (suggestion: VocabularySuggestion) => void;
  text: string;
}

export function VocabularyWordToken({
  getVocabularySuggestionState,
  isOpen = false,
  item,
  onSaveVocabularySuggestion,
  text,
}: VocabularyWordTokenProps) {
  const state = getVocabularySuggestionState?.(item) ?? "idle";
  const canSave = Boolean(onSaveVocabularySuggestion);
  const interaction = useVocabularyWordPopover({
    canSave,
    forceOpen: isOpen,
    item,
    state,
  });

  return (
    <span
      className={[
        "nado-word-token-wrap",
        interaction.isPopoverOpen ? "nado-word-token-wrap--open" : undefined,
      ]
        .filter(Boolean)
        .join(" ")}
      onBlurCapture={interaction.handleBlurCapture}
      onFocusCapture={interaction.openFocusFromKeyboard}
      onPointerDownCapture={interaction.trackPointerFocus}
      onPointerEnter={interaction.openHover}
      onPointerLeave={interaction.closeHoverWithDelay}
    >
      <button
        aria-expanded={interaction.isPopoverOpen ? true : undefined}
        aria-label={`${text} 뜻과 저장 액션 보기`}
        className="nado-word-token"
        onKeyDown={interaction.handleTokenKeyDown}
        ref={interaction.tokenRef}
        type="button"
      >
        {text}
      </button>
      <VocabularyWordPopover
        canSave={canSave}
        interaction={interaction}
        item={item}
        onSaveVocabularySuggestion={onSaveVocabularySuggestion}
        state={state}
      />
    </span>
  );
}
