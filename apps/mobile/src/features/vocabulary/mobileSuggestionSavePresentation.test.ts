import { describe, expect, it } from "vitest";
import {
  readSuggestionSaveActionLabel,
  readSuggestionSaveActionText,
  readSuggestionSavePrefix,
} from "./mobileSuggestionSavePresentation";

describe("mobile suggestion save presentation", () => {
  it.each([
    ["idle", "+", "+ 저장", "wondering, 궁금해하다 저장"],
    ["saving", "저장 중", "저장 중", "wondering, 궁금해하다 저장 중"],
    ["saved", "✓", "✓", "wondering, 궁금해하다 저장됨"],
  ] as const)(
    "exposes the %s state through text and accessibility labels",
    (state, prefix, actionText, actionLabel) => {
      expect(readSuggestionSavePrefix(state)).toBe(prefix);
      expect(readSuggestionSaveActionText(state)).toBe(actionText);
      expect(
        readSuggestionSaveActionLabel("wondering", "궁금해하다", state),
      ).toBe(actionLabel);
    },
  );
});
