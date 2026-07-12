/** @vitest-environment jsdom */

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppDataSync } from "./AppDataSync";

const mocks = vi.hoisted(() => ({
  refreshActiveStudySurface: vi.fn(),
  syncAnalysisUserScope: vi.fn(),
  syncVocabulary: vi.fn(),
  syncVocabularyRealtime: vi.fn(),
}));

vi.mock("../auth/authState", () => ({
  useAuthState: () => ({
    accessToken: "session-token",
    session: { user: { id: "user_1" } },
    status: "authenticated",
  }),
}));

vi.mock("../features/analysis/analysisState", () => ({
  useSyncAnalysisUserScope: mocks.syncAnalysisUserScope,
}));

vi.mock("../features/vocabulary/vocabularyState", () => ({
  useRefreshVocabularyForActiveStudySurface: mocks.refreshActiveStudySurface,
  useSyncVocabularyForAuth: mocks.syncVocabulary,
  useSyncVocabularyRealtimeForAuth: mocks.syncVocabularyRealtime,
}));

describe("AppDataSync", () => {
  it("keeps auth, vocabulary, and realtime sync mounted on the analysis surface", () => {
    render(<AppDataSync activeItem="analysis" />);

    expect(mocks.syncAnalysisUserScope).toHaveBeenCalledWith("user_1", false);
    expect(mocks.syncVocabulary).toHaveBeenCalledTimes(1);
    expect(mocks.syncVocabularyRealtime).toHaveBeenCalledTimes(1);
    expect(mocks.refreshActiveStudySurface).toHaveBeenCalledWith(
      expect.objectContaining({ status: "authenticated" }),
      false,
      "analysis",
    );
  });

  it("enables lifecycle refresh only for study surfaces", () => {
    render(<AppDataSync activeItem="review" />);

    expect(mocks.refreshActiveStudySurface).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "authenticated" }),
      true,
      "review",
    );
  });
});
