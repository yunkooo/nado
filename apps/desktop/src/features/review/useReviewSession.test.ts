/** @vitest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import type { VocabularyItem } from "@nado/shared/vocabulary";
import { describe, expect, it } from "vitest";
import type { AuthStateSnapshot } from "../../auth/authState";
import type { VocabularyStateSnapshot } from "../vocabulary/vocabularyState";
import { useReviewSession } from "./useReviewSession";

const firstItem = createVocabularyItem({
  id: "row_1",
  meaning: "검토하다",
  term: "review",
});
const secondItem = createVocabularyItem({
  id: "row_2",
  meaning: "조사하다",
  term: "inspect",
});

describe("useReviewSession", () => {
  it("keeps the current item and hides a revealed answer after a same-length update", () => {
    const { result, rerender } = renderHook(
      ({ items }: { items: VocabularyItem[] }) =>
        useReviewSession(authState, createVocabularyState(items)),
      {
        initialProps: {
          items: [firstItem, secondItem],
        },
      },
    );

    act(() => {
      result.current.moveNext();
    });
    act(() => {
      result.current.toggleAnswer();
    });

    expect(result.current.currentItem?.id).toBe("row_2");
    expect(result.current.isAnswerRevealed).toBe(true);

    rerender({
      items: [
        {
          ...secondItem,
          meanings: [{ meaning: "자세히 살펴보다" }],
          updatedAt: "2026-06-10T00:00:00.000Z",
        },
        firstItem,
      ],
    });

    expect(result.current.currentIndex).toBe(0);
    expect(result.current.currentItem?.id).toBe("row_2");
    expect(result.current.card?.answer).toBe("자세히 살펴보다");
    expect(result.current.isAnswerRevealed).toBe(false);
  });
});

const authState = {
  accessToken: "session-token",
  session: {
    access_token: "session-token",
    user: { id: "user_1" },
  },
  status: "authenticated",
} as AuthStateSnapshot;

function createVocabularyItem({
  id,
  meaning,
  term,
}: {
  id: string;
  meaning: string;
  term: string;
}): VocabularyItem {
  return {
    createdAt: "2026-06-09T00:00:00.000Z",
    id,
    meanings: [{ meaning }],
    term,
    type: "word",
    updatedAt: "2026-06-09T00:00:00.000Z",
  };
}

function createVocabularyState(
  items: VocabularyItem[],
): VocabularyStateSnapshot {
  return {
    accessToken: "session-token",
    items,
    message: null,
    status: "ready",
  };
}
