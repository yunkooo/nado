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
      <span className="nado-word-popover" role="tooltip">
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
            aria-label={`${item.term} 저장`}
            className="nado-word-popover__save"
            disabled={state !== "idle"}
            onClick={() => onSaveVocabularySuggestion?.(item)}
            type="button"
          >
            {state === "saving" ? "저장 중" : "+ 저장"}
          </button>
        ) : null}
      </span>
    </span>
  );
}
