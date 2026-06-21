import { describe, expect, it } from "vitest";
import { getVisibleMobileTranslationNoteParts } from "./translationNotes";

describe("mobile translation note display", () => {
  it("hides the repeated translation point label while keeping the explanation", () => {
    expect(
      getVisibleMobileTranslationNoteParts({
        note: "문맥에 맞춰 부드러운 한국어 어순으로 옮깁니다.",
        term: "번역 포인트",
      }),
    ).toEqual({
      note: "문맥에 맞춰 부드러운 한국어 어순으로 옮깁니다.",
      term: null,
    });
  });

  it("keeps specific translation note labels visible", () => {
    expect(
      getVisibleMobileTranslationNoteParts({
        note: "직역보다 상황을 살린 표현입니다.",
        term: "in the way",
      }),
    ).toEqual({
      note: "직역보다 상황을 살린 표현입니다.",
      term: "in the way",
    });
  });
});
