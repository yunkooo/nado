import { describe, expect, it } from "vitest";
import {
  createVocabularyMeaningMutationKey,
  type VocabularyItem,
} from "@nado/shared/vocabulary";
import {
  shouldReleaseMobileVocabularyDeleteRequest,
  type MobileVocabularyDeleteRequest,
} from "./mobileVocabularyDeleteRequest";

const mobileVocabularyItem: VocabularyItem = {
  createdAt: "2026-07-13T00:00:00.000Z",
  id: "item-1",
  meanings: [
    {
      createdAt: "2026-07-13T00:00:00.000Z",
      meaning: "상태",
    },
  ],
  term: "state",
  type: "word",
  updatedAt: "2026-07-13T00:00:00.000Z",
};
const deletedMeaning = mobileVocabularyItem.meanings[0]!;
const request: MobileVocabularyDeleteRequest = {
  heldAtReadyRevision: null,
  meaningKey: createVocabularyMeaningMutationKey(
    mobileVocabularyItem.id,
    deletedMeaning,
  ),
  readyRevisionAtStart: 1,
};

describe("mobile vocabulary delete request", () => {
  it("releases an item lock when an intervening ready snapshot removed the meaning", () => {
    expect(
      shouldReleaseMobileVocabularyDeleteRequest({
        itemId: mobileVocabularyItem.id,
        readySnapshot: {
          items: [
            {
              ...mobileVocabularyItem,
              meanings: [{ meaning: "남은 뜻" }],
            },
          ],
          revision: 2,
        },
        request,
      }),
    ).toBe(true);
  });

  it("keeps the item locked when the latest snapshot still contains the meaning", () => {
    expect(
      shouldReleaseMobileVocabularyDeleteRequest({
        itemId: mobileVocabularyItem.id,
        readySnapshot: {
          items: [mobileVocabularyItem],
          revision: 2,
        },
        request,
      }),
    ).toBe(false);
  });

  it("ignores snapshots that did not advance after the delete started", () => {
    expect(
      shouldReleaseMobileVocabularyDeleteRequest({
        itemId: mobileVocabularyItem.id,
        readySnapshot: {
          items: [],
          revision: 1,
        },
        request,
      }),
    ).toBe(false);
  });
});
