import { describe, expect, it } from "vitest";
import {
  getMobileStatePanelCopy,
  getMobileVocabularyPanelState,
} from "./mobilePanelState";
import type { MobileVocabularyState } from "../features/vocabulary/mobileVocabularyState";

const readyVocabularyState: MobileVocabularyState = {
  items: [
    {
      createdAt: "2026-06-10T00:00:00.000Z",
      id: "item-1",
      meanings: [{ meaning: "궁금해하다" }],
      term: "wondering",
      type: "word",
      updatedAt: "2026-06-10T00:00:00.000Z",
    },
  ],
  message: null,
  status: "ready",
};

describe("getMobileVocabularyPanelState", () => {
  it("requires auth before showing vocabulary items", () => {
    expect(
      getMobileVocabularyPanelState("anonymous", readyVocabularyState),
    ).toBe("auth_required");
  });

  it("shows a list for authenticated users with saved items", () => {
    expect(
      getMobileVocabularyPanelState("authenticated", readyVocabularyState),
    ).toBe("list");
  });
});

describe("getMobileStatePanelCopy", () => {
  it("uses API error messages when provided", () => {
    expect(
      getMobileStatePanelCopy(
        "vocabulary",
        "error",
        "API 서버 주소가 설정되지 않았어요.",
      ),
    ).toMatchObject({
      message: "API 서버 주소가 설정되지 않았어요.",
      title: "단어장을 불러오지 못했어요",
    });
  });
});
