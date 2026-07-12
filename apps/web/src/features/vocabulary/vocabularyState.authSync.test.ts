import { describe, expect, it, vi } from "vitest";
import type { VocabularyListResult } from "./vocabularyApi";
import {
  createVocabularyAuthSync,
  createVocabularyStateStore,
  getVocabularyStateForAuth,
  shouldLoadVocabularyForSession,
} from "./vocabularyState";
import { flushPromises, vocabularyItem } from "./vocabularyState.testHelpers";

describe("vocabulary state store", () => {
  it("hides a previous account snapshot until the current account is loaded", () => {
    const previousAccountState = {
      accessToken: "previous-token",
      items: [vocabularyItem],
      message: null,
      status: "ready" as const,
    };

    expect(
      getVocabularyStateForAuth(previousAccountState, {
        accessToken: "current-token",
        session: null,
        status: "authenticated",
      }),
    ).toEqual({
      accessToken: "current-token",
      items: [],
      message: null,
      status: "loading",
    });
    expect(
      getVocabularyStateForAuth(previousAccountState, {
        accessToken: null,
        session: null,
        status: "anonymous",
      }),
    ).toEqual({
      accessToken: null,
      items: [],
      message: null,
      status: "idle",
    });
  });

  it("settles a vocabulary sync request even after the triggering render is gone", async () => {
    const store = createVocabularyStateStore();
    const listVocabulary = vi.fn(async () => ({
      data: [vocabularyItem],
      status: "success" as const,
    }));
    const sync = createVocabularyAuthSync({
      listVocabulary,
      store,
    });

    sync.sync({
      accessToken: "session-token",
      session: null,
      status: "authenticated",
    });

    expect(store.getSnapshot()).toMatchObject({
      accessToken: "session-token",
      status: "loading",
    });

    await flushPromises();

    expect(store.getSnapshot()).toMatchObject({
      accessToken: "session-token",
      items: [vocabularyItem],
      status: "ready",
    });
  });

  it("uses the latest Supabase access token before refreshing vocabulary", async () => {
    const store = createVocabularyStateStore();
    const listVocabulary = vi.fn(async () => ({
      data: [vocabularyItem],
      status: "success" as const,
    }));
    const sync = createVocabularyAuthSync({
      getAccessToken: async () => "fresh-token",
      listVocabulary,
      store,
    });

    store.setReady("stale-token", []);
    sync.refresh({
      accessToken: "stale-token",
      session: null,
      status: "authenticated",
    });

    await flushPromises();

    expect(listVocabulary).toHaveBeenCalledWith("fresh-token");
    expect(store.getSnapshot()).toMatchObject({
      accessToken: "fresh-token",
      items: [vocabularyItem],
      status: "ready",
    });
  });

  it("settles thrown vocabulary sync failures as an error state", async () => {
    const store = createVocabularyStateStore();
    const listVocabulary = vi.fn(async () => {
      throw new Error("network lost");
    });
    const sync = createVocabularyAuthSync({
      listVocabulary,
      store,
    });

    sync.sync({
      accessToken: "session-token",
      session: null,
      status: "authenticated",
    });

    await flushPromises();

    expect(store.getSnapshot()).toMatchObject({
      accessToken: "session-token",
      items: [],
      message: "단어장을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
      status: "error",
    });
  });

  it("ignores stale vocabulary sync results after a later session starts", async () => {
    const store = createVocabularyStateStore();
    const firstRequest: {
      resolve?: (result: VocabularyListResult) => void;
    } = {};
    const listVocabulary = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<VocabularyListResult>((resolve) => {
            firstRequest.resolve = resolve;
          }),
      )
      .mockResolvedValueOnce({
        data: [
          {
            ...vocabularyItem,
            id: "row_2",
            term: "before",
          },
        ],
        status: "success" as const,
      });
    const sync = createVocabularyAuthSync({
      listVocabulary,
      store,
    });

    sync.sync({
      accessToken: "first-token",
      session: null,
      status: "authenticated",
    });
    sync.sync({
      accessToken: "second-token",
      session: null,
      status: "authenticated",
    });

    await flushPromises();
    if (!firstRequest.resolve) {
      throw new Error("Expected the first vocabulary request to start.");
    }

    firstRequest.resolve({
      data: [vocabularyItem],
      status: "success",
    });
    await flushPromises();

    expect(store.getSnapshot()).toMatchObject({
      accessToken: "second-token",
      items: [
        expect.objectContaining({
          id: "row_2",
        }),
      ],
      status: "ready",
    });
  });

  it("allows a same-token reload after a vocabulary load error", () => {
    expect(
      shouldLoadVocabularyForSession(
        {
          accessToken: "session-token",
          items: [],
          message: "단어장을 불러오지 못했어요.",
          status: "error",
        },
        "session-token",
      ),
    ).toBe(true);
  });

  it("skips same-token reloads while vocabulary is already loading or ready", () => {
    expect(
      shouldLoadVocabularyForSession(
        {
          accessToken: "session-token",
          items: [],
          message: null,
          status: "loading",
        },
        "session-token",
      ),
    ).toBe(false);

    expect(
      shouldLoadVocabularyForSession(
        {
          accessToken: "session-token",
          items: [vocabularyItem],
          message: null,
          status: "ready",
        },
        "session-token",
      ),
    ).toBe(false);
  });
});
