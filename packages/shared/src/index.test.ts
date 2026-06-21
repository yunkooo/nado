import { describe, expect, it, vi } from "vitest";
import {
  MAX_ANALYSIS_TEXT_LENGTH,
  analyzeResponseJsonSchema,
  analyzeResponseSchema,
  countAnalysisTextCharacters,
  createVocabularyRealtimeRefreshScheduler,
  createVocabularyRealtimeTopic,
  createVocabularyMeaningRenderKey,
  getDistinctVocabularyNote,
  hasUnsupportedAnalysisTextCharacters,
  isVocabularyRealtimeTopicForUser,
  isLikelyEnglishLearningText,
  moveVocabularyPage,
  normalizeAnalysisText,
  normalizeVocabularyTerm,
  paginateVocabularyItems,
  parseAnalyzeRequest,
  resetVocabularyPaginationScroll,
  saveVocabularyRequestSchema,
  shouldStartVocabularyManualRefresh,
  shouldRefreshVocabularyFromLifecycle,
} from "./index";

describe("parseAnalyzeRequest", () => {
  it("keeps the MVP analysis input limit at 200 characters", () => {
    expect(MAX_ANALYSIS_TEXT_LENGTH).toBe(200);
  });

  it("trims valid analysis text", () => {
    expect(
      parseAnalyzeRequest({ text: "  I was wondering if you could help.  " }),
    ).toEqual({
      text: "I was wondering if you could help.",
    });
  });

  it("rejects blank analysis text", () => {
    expect(() => parseAnalyzeRequest({ text: "   " })).toThrow(
      "analysis.text.required",
    );
  });

  it("rejects text longer than the MVP limit", () => {
    expect(() =>
      parseAnalyzeRequest({ text: "a".repeat(MAX_ANALYSIS_TEXT_LENGTH + 1) }),
    ).toThrow("analysis.text.too_long");
  });

  it("normalizes compatible unicode before validating text", () => {
    expect(parseAnalyzeRequest({ text: "  Ｉ leave home．  " })).toEqual({
      text: "I leave home.",
    });
  });

  it("rejects invisible format characters", () => {
    expect(() => parseAnalyzeRequest({ text: "I\u200B leave home." })).toThrow(
      "analysis.text.unsupported_characters",
    );
  });

  it("rejects unsupported symbols even when the text is short", () => {
    expect(() => parseAnalyzeRequest({ text: "I leave home 💣" })).toThrow(
      "analysis.text.unsupported_characters",
    );
  });
});

describe("analysis text helpers", () => {
  it("counts normalized Unicode code points instead of UTF-16 units", () => {
    const normalized = normalizeAnalysisText("  Ｉ leave home．  ");

    expect(normalized).toBe("I leave home.");
    expect(countAnalysisTextCharacters("  Ｉ leave home．  ")).toBe(
      Array.from(normalized).length,
    );
  });

  it("detects control and format characters as unsupported", () => {
    expect(hasUnsupportedAnalysisTextCharacters("I\u202E leave home.")).toBe(
      true,
    );
    expect(hasUnsupportedAnalysisTextCharacters("I leave home.")).toBe(false);
  });
});

describe("normalizeVocabularyTerm", () => {
  it("normalizes case and repeated spaces", () => {
    expect(normalizeVocabularyTerm("  Wonder   If  ")).toBe("wonder if");
  });
});

describe("paginateVocabularyItems", () => {
  it("shows vocabulary items in pages of 10", () => {
    const items = Array.from({ length: 24 }, (_, index) => `item-${index + 1}`);

    expect(paginateVocabularyItems(items, 2).items).toEqual([
      "item-11",
      "item-12",
      "item-13",
      "item-14",
      "item-15",
      "item-16",
      "item-17",
      "item-18",
      "item-19",
      "item-20",
    ]);
  });

  it("clamps the current page to the available vocabulary page range", () => {
    const items = Array.from({ length: 11 }, (_, index) => `item-${index + 1}`);

    expect(paginateVocabularyItems(items, 4)).toMatchObject({
      currentPage: 2,
      totalPages: 2,
    });
    expect(paginateVocabularyItems(items, 0)).toMatchObject({
      currentPage: 1,
      totalPages: 2,
    });
  });

  it("keeps an empty vocabulary list on page 1", () => {
    expect(paginateVocabularyItems([], 3)).toEqual({
      currentPage: 1,
      items: [],
      pageSize: 10,
      totalItems: 0,
      totalPages: 1,
    });
  });
});

describe("vocabulary pagination navigation", () => {
  it("moves to the next page and resets the scroll position", () => {
    const setPage = vi.fn();
    const scrollTarget = {
      scrollTo: vi.fn(),
    };

    moveVocabularyPage(2, setPage, scrollTarget);

    expect(setPage).toHaveBeenCalledWith(2);
    expect(scrollTarget.scrollTo).toHaveBeenCalledWith({
      behavior: "auto",
      top: 0,
    });
  });

  it("falls back to the window scroll position when no target is provided", () => {
    const originalScrollTo = globalThis.scrollTo;
    const scrollTo = vi.fn();

    vi.stubGlobal("scrollTo", scrollTo);
    resetVocabularyPaginationScroll();

    expect(scrollTo).toHaveBeenCalledWith({ behavior: "auto", top: 0 });

    globalThis.scrollTo = originalScrollTo;
  });

  it("falls back to the window scroll position when the target cannot scroll", () => {
    const originalScrollTo = globalThis.scrollTo;
    const scrollTo = vi.fn();
    const scrollTarget = {
      clientHeight: 100,
      scrollHeight: 100,
      scrollTo: vi.fn(),
    };

    vi.stubGlobal("scrollTo", scrollTo);
    resetVocabularyPaginationScroll(scrollTarget);

    expect(scrollTarget.scrollTo).toHaveBeenCalledWith({
      behavior: "auto",
      top: 0,
    });
    expect(scrollTo).toHaveBeenCalledWith({ behavior: "auto", top: 0 });

    globalThis.scrollTo = originalScrollTo;
  });
});

describe("createVocabularyMeaningRenderKey", () => {
  it("keeps duplicate meanings renderable with unique keys", () => {
    const duplicateMeaning = {
      createdAt: "2026-06-10T00:00:00.000Z",
      meaning: "상태",
    };

    expect([
      createVocabularyMeaningRenderKey("row_1", duplicateMeaning, 0),
      createVocabularyMeaningRenderKey("row_1", duplicateMeaning, 1),
    ]).toEqual([
      "row_1-2026-06-10T00:00:00.000Z-상태-0",
      "row_1-2026-06-10T00:00:00.000Z-상태-1",
    ]);
  });
});

describe("getDistinctVocabularyNote", () => {
  it("keeps notes that add context beyond the meaning", () => {
    expect(
      getDistinctVocabularyNote("일정이나 계획을 확인할 때 자주 씁니다.", [
        "검토하다",
        "go over",
      ]),
    ).toBe("일정이나 계획을 확인할 때 자주 씁니다.");
  });

  it("removes notes that repeat the answer or prompt text", () => {
    expect(getDistinctVocabularyNote(" 피하다 ", ["피하다", "avoid"])).toBe("");
    expect(getDistinctVocabularyNote(" Avoid ", ["피하다", "avoid"])).toBe("");
  });
});

describe("analyzeResponseSchema", () => {
  it("accepts the MVP structured analysis response", () => {
    const response = analyzeResponseSchema.parse({
      status: "analyzable",
      result: {
        translation: "이 문제를 도와주실 수 있는지 궁금합니다.",
        translationExplanation:
          "직접적인 질문보다 부드럽고 정중한 요청 표현입니다.",
        sentences: [
          {
            source: "I was wondering if you could help me with this issue.",
            translation: "이 문제를 도와주실 수 있는지 궁금합니다.",
            explanation: "정중하게 도움을 요청하는 문장입니다.",
            tokens: [
              { text: "I", vocabularyKey: "i" },
              { text: ".", vocabularyKey: null },
            ],
            chunks: [
              {
                english: "I was wondering if",
                literalTranslation: "제가 ~인지 궁금해하고 있었습니다",
                role: "정중하게 질문을 시작하는 부분입니다.",
              },
            ],
            grammarPoints: [
              {
                title: "was wondering if",
                grammarType: "정중한 요청 표현",
                explanation:
                  "직접적으로 묻기보다 부드럽고 정중하게 요청할 때 씁니다.",
              },
            ],
          },
        ],
        structure: [
          {
            english: "I was wondering if",
            korean: "~인지 궁금했습니다",
            note: "정중하게 부탁할 때 쓰는 시작 표현",
          },
        ],
        grammarPoints: [
          {
            title: "was wondering if",
            explanation: "직접적인 질문보다 부드러운 요청 표현입니다.",
          },
        ],
        vocabularyItems: [
          {
            key: "wonder",
            term: "wondering",
            baseForm: "wonder",
            type: "word",
            partOfSpeech: "verb",
            meaning: "궁금해하다",
            contextMeaning: "정중하게 질문이나 부탁을 꺼낼 때 쓰였습니다.",
            saveLabel: "wonder",
          },
        ],
        vocabularySuggestions: [
          {
            key: "wonder",
            term: "wonder",
            type: "word",
            meaning: "궁금해하다",
            note: "정중한 요청 표현에서 자주 보입니다.",
          },
        ],
      },
    });

    expect(response.status).toBe("analyzable");
  });

  it("rejects analysis responses without chunk literal translations", () => {
    expect(() =>
      analyzeResponseSchema.parse({
        status: "analyzable",
        result: {
          translation: "번역",
          translationExplanation: "설명",
          sentences: [
            {
              source: "Hello.",
              translation: "안녕하세요.",
              explanation: "인사입니다.",
              tokens: [{ text: "Hello", vocabularyKey: "hello" }],
              chunks: [{ english: "Hello", role: "인사 표현입니다." }],
              grammarPoints: [],
            },
          ],
          structure: [],
          grammarPoints: [],
          vocabularyItems: [],
          vocabularySuggestions: [],
        },
      }),
    ).toThrow();
  });

  it("accepts not-analyzable responses", () => {
    expect(
      analyzeResponseSchema.parse({
        status: "not_analyzable",
        reason: "영어 문장으로 분석하기 어려운 입력입니다.",
      }),
    ).toEqual({
      status: "not_analyzable",
      reason: "영어 문장으로 분석하기 어려운 입력입니다.",
    });
  });
});

describe("vocabulary realtime helpers", () => {
  it("allows the first manual vocabulary refresh and throttles rapid repeats", () => {
    expect(
      shouldStartVocabularyManualRefresh({
        isRefreshing: false,
        lastStartedAt: undefined,
        now: 10_000,
        throttleMs: 2_000,
      }),
    ).toBe(true);
    expect(
      shouldStartVocabularyManualRefresh({
        isRefreshing: false,
        lastStartedAt: 9_000,
        now: 10_000,
        throttleMs: 2_000,
      }),
    ).toBe(false);
    expect(
      shouldStartVocabularyManualRefresh({
        isRefreshing: false,
        lastStartedAt: 8_000,
        now: 10_000,
        throttleMs: 2_000,
      }),
    ).toBe(true);
  });

  it("blocks manual vocabulary refreshes while another one is in flight", () => {
    expect(
      shouldStartVocabularyManualRefresh({
        isRefreshing: true,
        lastStartedAt: undefined,
        now: 10_000,
        throttleMs: 2_000,
      }),
    ).toBe(false);
  });

  it("refreshes lifecycle vocabulary only when the active snapshot is stale or not ready", () => {
    expect(
      shouldRefreshVocabularyFromLifecycle({
        isStudySurfaceActive: false,
        lastLoadedAt: undefined,
        now: 120_000,
        status: "ready",
      }),
    ).toBe(false);
    expect(
      shouldRefreshVocabularyFromLifecycle({
        isStudySurfaceActive: true,
        lastLoadedAt: 90_000,
        now: 120_000,
        status: "ready",
      }),
    ).toBe(false);
    expect(
      shouldRefreshVocabularyFromLifecycle({
        isStudySurfaceActive: true,
        lastLoadedAt: 30_000,
        now: 120_000,
        status: "ready",
      }),
    ).toBe(true);
    expect(
      shouldRefreshVocabularyFromLifecycle({
        isStudySurfaceActive: true,
        lastLoadedAt: 90_000,
        now: 120_000,
        status: "error",
      }),
    ).toBe(true);
  });

  it("creates a user-scoped vocabulary realtime topic", () => {
    expect(createVocabularyRealtimeTopic(" user-id ")).toBe(
      "vocabulary:user-id",
    );
    expect(createVocabularyRealtimeTopic("")).toBeNull();
    expect(createVocabularyRealtimeTopic(null)).toBeNull();
  });

  it("matches vocabulary realtime topics against the current user", () => {
    expect(
      isVocabularyRealtimeTopicForUser("vocabulary:user-id", "user-id"),
    ).toBe(true);
    expect(
      isVocabularyRealtimeTopicForUser("vocabulary:other-user", "user-id"),
    ).toBe(false);
    expect(isVocabularyRealtimeTopicForUser("profile:user-id", "user-id")).toBe(
      false,
    );
  });

  it("debounces repeated vocabulary realtime refresh requests", () => {
    const timers = createFakeTimers();
    const refresh = vi.fn();
    const scheduler = createVocabularyRealtimeRefreshScheduler({
      debounceMs: 50,
      refresh,
      timers,
    });

    scheduler.schedule();
    scheduler.schedule();
    scheduler.schedule();

    expect(timers.setTimeout).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();

    timers.runNext();

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("schedules one more refresh when events arrive during an active refresh", async () => {
    const timers = createFakeTimers();
    let resolveRefresh: (() => void) | undefined;
    const refresh = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    const scheduler = createVocabularyRealtimeRefreshScheduler({
      debounceMs: 50,
      refresh,
      timers,
    });

    scheduler.schedule();
    timers.runNext();

    scheduler.schedule();
    timers.runNext();

    expect(refresh).toHaveBeenCalledTimes(1);

    resolveRefresh?.();
    await Promise.resolve();

    expect(timers.pendingCount()).toBe(1);

    timers.runNext();

    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("cancels a pending vocabulary realtime refresh", () => {
    const timers = createFakeTimers();
    const refresh = vi.fn();
    const scheduler = createVocabularyRealtimeRefreshScheduler({
      debounceMs: 50,
      refresh,
      timers,
    });

    scheduler.schedule();
    scheduler.cancel();
    timers.runNext();

    expect(timers.clearTimeout).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
  });
});

function createFakeTimers() {
  let nextId = 1;
  const tasks = new Map<number, () => void>();

  return {
    clearTimeout: vi.fn((id: number) => {
      tasks.delete(id);
    }),
    pendingCount() {
      return tasks.size;
    },
    runNext() {
      const [id, callback] = tasks.entries().next().value ?? [];

      if (typeof id !== "number" || !callback) {
        return;
      }

      tasks.delete(id);
      callback();
    },
    setTimeout: vi.fn((callback: () => void) => {
      const id = nextId;
      nextId += 1;
      tasks.set(id, callback);

      return id;
    }),
  };
}

describe("analyzeResponseJsonSchema", () => {
  it("uses an OpenAI structured-output compatible root object", () => {
    expect(analyzeResponseJsonSchema).toMatchObject({
      additionalProperties: false,
      type: "object",
    });
    expect(analyzeResponseJsonSchema).not.toHaveProperty("oneOf");
  });
});

describe("saveVocabularyRequestSchema", () => {
  it("trims a valid vocabulary save request", () => {
    expect(
      saveVocabularyRequestSchema.parse({
        term: "  wonder if  ",
        type: "phrase",
        meaning: "  ~인지 궁금하다  ",
        note: "  정중한 질문에서 자주 쓰입니다.  ",
      }),
    ).toEqual({
      term: "wonder if",
      type: "phrase",
      meaning: "~인지 궁금하다",
      note: "정중한 질문에서 자주 쓰입니다.",
    });
  });

  it("drops duplicate vocabulary notes that repeat the meaning", () => {
    expect(
      saveVocabularyRequestSchema.parse({
        term: "avoid",
        type: "word",
        meaning: "피하다",
        note: " 피하다 ",
      }),
    ).toEqual({
      term: "avoid",
      type: "word",
      meaning: "피하다",
    });
  });
});

describe("isLikelyEnglishLearningText", () => {
  it("accepts ordinary English sentences", () => {
    expect(
      isLikelyEnglishLearningText("I was wondering if you could help me."),
    ).toBe(true);
  });

  it("rejects mostly numeric or symbolic input", () => {
    expect(isLikelyEnglishLearningText("1234567890 !!!")).toBe(false);
  });

  it("rejects English-looking text with unsupported hidden characters", () => {
    expect(isLikelyEnglishLearningText("I\u200B leave home.")).toBe(false);
  });
});
