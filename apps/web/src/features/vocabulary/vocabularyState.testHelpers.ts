import type { VocabularyItem } from "@nado/shared/vocabulary";
import type { AuthStateSnapshot } from "../auth/authState";

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

export function createAuthenticatedAuthState(
  accessToken: string,
  userId: string,
) {
  return {
    accessToken,
    session: {
      user: {
        id: userId,
      },
    } as AuthStateSnapshot["session"],
    status: "authenticated" as const,
  };
}

export async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

export function createDeferred<T>() {
  let reject!: (reason?: unknown) => void;
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, reject, resolve };
}
