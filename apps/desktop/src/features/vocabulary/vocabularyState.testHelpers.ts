import type { VocabularyItem } from "@nado/shared/vocabulary";
import type { AuthStateSnapshot } from "../../auth/authState";

export const vocabularyItem: VocabularyItem = {
  createdAt: "2026-06-09T00:00:00.000Z",
  id: "row_1",
  meanings: [
    {
      createdAt: "2026-06-09T00:00:00.000Z",
      meaning: "~한 후에",
    },
  ],
  term: "after",
  type: "phrase",
  updatedAt: "2026-06-09T00:00:00.000Z",
};

export async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

export function createAuthenticatedAuthState(
  accessToken = "session-token",
): AuthStateSnapshot {
  return {
    accessToken,
    session: {
      access_token: accessToken,
      user: {
        id: "user_1",
      },
    },
    status: "authenticated" as const,
  } as AuthStateSnapshot;
}
