import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const reviewScreenSource = readFileSync(
  new URL("./ReviewScreen.tsx", import.meta.url),
  "utf8",
);

describe("ReviewScreen shared session wiring", () => {
  it("filters reviewable items and keeps the current card stable by id", () => {
    expect(reviewScreenSource).toContain("getReviewableItems");
    expect(reviewScreenSource).toContain("getCurrentReviewIndex");
    expect(reviewScreenSource).toContain("createReviewCardKey");
    expect(reviewScreenSource).toContain("setCurrentItemId");
    expect(reviewScreenSource).not.toContain(
      "vocabularyState.items[currentCardIndex]",
    );
  });
});
