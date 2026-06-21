import { describe, expect, it } from "vitest";
import { applyLoadVocabularyError } from "./mobileVocabularyState";

describe("applyLoadVocabularyError", () => {
  it("preserves a ready empty vocabulary snapshot on non-disruptive refresh failures", () => {
    expect(
      applyLoadVocabularyError(
        {
          items: [],
          message: null,
          status: "ready",
        },
        {
          message: "단어장을 불러오지 못했어요.",
          preserveCurrentOnError: true,
        },
      ),
    ).toEqual({
      items: [],
      message: "단어장을 불러오지 못했어요.",
      status: "ready",
    });
  });

  it("keeps initial load failures disruptive when there is no ready snapshot", () => {
    expect(
      applyLoadVocabularyError(
        {
          items: [],
          message: null,
          status: "loading",
        },
        {
          message: "단어장을 불러오지 못했어요.",
          preserveCurrentOnError: false,
        },
      ),
    ).toEqual({
      items: [],
      message: "단어장을 불러오지 못했어요.",
      status: "error",
    });
  });
});
