import { describe, expect, it } from "vitest";
import {
  decodeVocabularyCursor,
  encodeVocabularyCursor,
} from "./vocabularyCursor.js";

describe("vocabulary cursor", () => {
  it("round-trips a stable keyset cursor", () => {
    const cursor = {
      id: "018f4ad4-7a21-7e45-8f46-7f2d0633c331",
      updatedAt: "2026-06-09T00:00:00.000Z",
    };

    expect(decodeVocabularyCursor(encodeVocabularyCursor(cursor))).toEqual(
      cursor,
    );
  });

  it("rejects malformed and non-UUID cursors", () => {
    expect(() => decodeVocabularyCursor("not-a-cursor")).toThrow(
      "단어장 페이지 커서가 올바르지 않습니다.",
    );
    expect(() =>
      decodeVocabularyCursor(
        Buffer.from(
          JSON.stringify({
            id: "row_1",
            updatedAt: "2026-06-09T00:00:00.000Z",
          }),
        ).toString("base64url"),
      ),
    ).toThrow("단어장 페이지 커서가 올바르지 않습니다.");
  });
});
