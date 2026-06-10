import type {
  VocabularyItem,
  VocabularySuggestion,
  VocabularySuggestionSaveState,
} from "./analysisTypes";

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

  return (
    <span
      className={[
        "nado-word-token-wrap",
        isOpen ? "nado-word-token-wrap--open" : undefined,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        aria-expanded={isOpen ? true : undefined}
        aria-label={`${text} 뜻과 저장 액션 보기`}
        className="nado-word-token"
        type="button"
      >
        {text}
      </button>
      <span
        aria-label={`${item.term} 뜻과 저장 액션`}
        className="nado-word-popover"
        role="group"
      >
        <span className="nado-word-popover__header">
          <strong>{item.term}</strong>
          {item.partOfSpeech ? <span>{item.partOfSpeech}</span> : null}
        </span>
        <span className="nado-word-popover__meaning">{item.meaning}</span>
        <span className="nado-word-popover__context">
          {item.contextMeaning}
        </span>
        {canSave ? (
          <button
            aria-label={getSaveActionLabel(item.term, state)}
            className="nado-word-popover__save"
            disabled={state !== "idle"}
            onClick={() => onSaveVocabularySuggestion?.(item)}
            type="button"
          >
            {getSaveActionText(state)}
          </button>
        ) : null}
      </span>
    </span>
  );
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
    return "저장됨";
  }

  return "+ 저장";
}
