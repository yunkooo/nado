import { createPortal } from "react-dom";
import type {
  VocabularyItem,
  VocabularySuggestion,
  VocabularySuggestionSaveState,
} from "./analysisTypes";
import type { useVocabularyWordPopover } from "./useVocabularyWordPopover";
import { createWordPopoverStyle } from "./wordPopoverPosition";

type VocabularyWordPopoverInteraction = ReturnType<
  typeof useVocabularyWordPopover
>;

export function VocabularyWordPopover({
  canSave,
  interaction,
  item,
  onSaveVocabularySuggestion,
  state,
}: {
  canSave: boolean;
  interaction: VocabularyWordPopoverInteraction;
  item: VocabularyItem;
  onSaveVocabularySuggestion?: (suggestion: VocabularySuggestion) => void;
  state: VocabularySuggestionSaveState;
}) {
  const popover = (
    <span
      aria-label={`${item.term} 뜻과 저장 액션`}
      className={[
        "nado-word-popover",
        interaction.isPopoverOpen ? "nado-word-popover--open" : undefined,
      ]
        .filter(Boolean)
        .join(" ")}
      data-placement={interaction.popoverPosition?.placement ?? "top"}
      onBlurCapture={interaction.handleBlurCapture}
      onFocusCapture={interaction.openFocusFromKeyboard}
      onPointerDownCapture={interaction.trackPointerFocus}
      onPointerEnter={interaction.openHover}
      onPointerLeave={interaction.closeHoverWithDelay}
      ref={interaction.popoverRef}
      role="group"
      style={createWordPopoverStyle(interaction.popoverPosition)}
    >
      <span className="nado-word-popover__header">
        <strong>{item.term}</strong>
        {item.partOfSpeech ? <span>{item.partOfSpeech}</span> : null}
      </span>
      <span className="nado-word-popover__meaning">{item.meaning}</span>
      <span className="nado-word-popover__context">{item.contextMeaning}</span>
      {canSave ? (
        <button
          aria-label={getSaveActionLabel(item.term, state)}
          className="nado-word-popover__save"
          disabled={state !== "idle"}
          onClick={() => onSaveVocabularySuggestion?.(item)}
          onKeyDown={interaction.handleSaveButtonKeyDown}
          type="button"
        >
          {getSaveActionText(state)}
        </button>
      ) : null}
    </span>
  );

  return interaction.popoverRoot
    ? createPortal(popover, interaction.popoverRoot)
    : popover;
}

function getSaveActionLabel(
  term: string,
  state: VocabularySuggestionSaveState,
) {
  if (state === "saving") {
    return `${term} 저장 중`;
  }

  if (state === "saved") {
    return `${term} 저장됨`;
  }

  return `${term} 저장`;
}

function getSaveActionText(state: VocabularySuggestionSaveState) {
  if (state === "saving") {
    return "저장 중";
  }

  if (state === "saved") {
    return "✓";
  }

  return "+ 저장";
}
