export type MobileSuggestionSaveState = "idle" | "saved" | "saving";

export function readSuggestionSavePrefix(state: MobileSuggestionSaveState) {
  if (state === "saving") {
    return "저장 중";
  }

  if (state === "saved") {
    return "✓";
  }

  return "+";
}

export function readSuggestionSaveActionText(state: MobileSuggestionSaveState) {
  if (state === "saving") {
    return "저장 중";
  }

  if (state === "saved") {
    return "✓";
  }

  return "+ 저장";
}

export function readSuggestionSaveActionLabel(
  term: string,
  meaning: string,
  state: MobileSuggestionSaveState,
) {
  if (state === "saving") {
    return `${term}, ${meaning} 저장 중`;
  }

  if (state === "saved") {
    return `${term}, ${meaning} 저장됨`;
  }

  return `${term}, ${meaning} 저장`;
}
