import { describe, expect, it } from "vitest";
import type { MobileSentenceAnalysis } from "../../api/analysisApi";
import { findMatchingMobileSentenceToken } from "./mobileVocabularyTokenMatch";

const tokens: MobileSentenceAnalysis["tokens"] = [
  { text: "Could", vocabularyKey: null },
  { text: "you", vocabularyKey: "you" },
  { text: "HELP", vocabularyKey: "help" },
];

describe("findMatchingMobileSentenceToken", () => {
  it("keeps sequential token matching across rendered chunks", () => {
    const first = findMatchingMobileSentenceToken(tokens, 0, "you");
    const second = findMatchingMobileSentenceToken(
      tokens,
      first.nextTokenIndex,
      "help",
    );

    expect(first.token?.vocabularyKey).toBe("you");
    expect(second).toMatchObject({
      nextTokenIndex: 3,
      token: { vocabularyKey: "help" },
    });
  });

  it("preserves the start index when no matching token exists", () => {
    expect(findMatchingMobileSentenceToken(tokens, 1, "missing")).toEqual({
      nextTokenIndex: 1,
      token: undefined,
    });
  });
});
