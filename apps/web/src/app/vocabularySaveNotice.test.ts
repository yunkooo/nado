import { describe, expect, it } from "vitest";
import {
  createVocabularyLoginRequiredNotice,
  createVocabularySaveSuccessNotice,
} from "./vocabularySaveNotice";

describe("vocabulary save notice", () => {
  it("asks anonymous users to log in before saving", () => {
    expect(createVocabularyLoginRequiredNotice()).toEqual({
      text: "로그인이 필요해요. Google 로그인 후 단어장에 저장할 수 있어요.",
      tone: "error",
    });
  });

  it("confirms when an authenticated save succeeds", () => {
    expect(createVocabularySaveSuccessNotice()).toEqual({
      text: "단어장에 저장했어요.",
      tone: "success",
    });
  });
});
