import { describe, expect, it } from "vitest";
import {
  createVocabularyService,
  type NewVocabularyRow,
  type VocabularyRow,
  type VocabularyRowsPage,
  type VocabularyStore,
} from "./vocabularyService.js";

class MemoryVocabularyStore implements VocabularyStore {
  rows: VocabularyRow[];

  constructor(rows: VocabularyRow[] = []) {
    this.rows = rows;
  }

  async listByUser(userId: string): Promise<VocabularyRowsPage> {
    return {
      nextCursor: null,
      rows: this.rows.filter((row) => row.user_id === userId),
    };
  }

  async save(row: NewVocabularyRow): Promise<VocabularyRow> {
    const normalizedTerm = normalizeTerm(row.term);
    const existing = this.rows.find(
      (candidate) =>
        candidate.user_id === row.user_id &&
        candidate.normalized_term === normalizedTerm &&
        candidate.type === row.type,
    );
    const [meaning] = row.meanings;

    if (!meaning) {
      throw new Error("Memory vocabulary save requires a meaning.");
    }

    if (!existing) {
      const timestamp = meaning.createdAt ?? new Date().toISOString();
      const inserted = {
        ...row,
        created_at: timestamp,
        id: `row_${this.rows.length + 1}`,
        normalized_term: normalizedTerm,
        updated_at: timestamp,
      };

      this.rows.push(inserted);

      return inserted;
    }

    if (!hasMeaning(existing.meanings, meaning)) {
      existing.meanings = [...existing.meanings, meaning];
      existing.updated_at = meaning.createdAt ?? existing.updated_at;
    }

    return existing;
  }

  async deleteByUserId(id: string, userId: string): Promise<boolean> {
    const before = this.rows.length;
    this.rows = this.rows.filter(
      (row) => row.id !== id || row.user_id !== userId,
    );

    return this.rows.length < before;
  }

  async deleteMeaningByUserId(
    id: string,
    userId: string,
    meaning: VocabularyRow["meanings"][number],
  ) {
    const row = this.rows.find(
      (candidate) => candidate.id === id && candidate.user_id === userId,
    );

    if (!row) {
      return null;
    }

    const meaningIndex = row.meanings.findIndex(
      (candidate) =>
        candidate.meaning.trim() === meaning.meaning.trim() &&
        (candidate.note?.trim() ?? "") === (meaning.note?.trim() ?? "") &&
        (!meaning.createdAt || candidate.createdAt === meaning.createdAt),
    );

    if (meaningIndex < 0) {
      return null;
    }

    if (row.meanings.length === 1) {
      this.rows = this.rows.filter((candidate) => candidate.id !== row.id);
      return { itemDeleted: true as const, row: null };
    }

    row.meanings = row.meanings.filter((_, index) => index !== meaningIndex);
    return { itemDeleted: false as const, row };
  }
}

describe("createVocabularyService", () => {
  it("lists vocabulary items without exposing the user id", async () => {
    const service = createVocabularyService({
      store: new MemoryVocabularyStore([
        {
          created_at: "2026-06-09T00:00:00.000Z",
          id: "row_1",
          meanings: [
            {
              createdAt: "2026-06-09T00:00:00.000Z",
              meaning: "~인지 궁금하다",
              note: "정중한 질문에서 자주 쓰입니다.",
            },
          ],
          normalized_term: "wonder if",
          term: "wonder if",
          type: "phrase",
          updated_at: "2026-06-09T00:00:00.000Z",
          user_id: "user_1",
        },
      ]),
    });

    await expect(service.list("user_1")).resolves.toEqual({
      items: [
        {
          createdAt: "2026-06-09T00:00:00.000Z",
          id: "row_1",
          meanings: [
            {
              createdAt: "2026-06-09T00:00:00.000Z",
              meaning: "~인지 궁금하다",
              note: "정중한 질문에서 자주 쓰입니다.",
            },
          ],
          term: "wonder if",
          type: "phrase",
          updatedAt: "2026-06-09T00:00:00.000Z",
        },
      ],
      nextCursor: null,
    });
  });

  it("normalizes Postgres timestamp offsets before returning vocabulary items", async () => {
    const service = createVocabularyService({
      store: new MemoryVocabularyStore([
        {
          created_at: "2026-06-09T08:10:40+00:00",
          id: "row_1",
          meanings: [
            {
              createdAt: "2026-06-09T08:10:40.000Z",
              meaning: "직접 저장",
            },
          ],
          normalized_term: "nado-rest-save",
          term: "nado-rest-save",
          type: "word",
          updated_at: "2026-06-09T08:10:40+00:00",
          user_id: "user_1",
        },
      ]),
    });

    await expect(service.list("user_1")).resolves.toEqual({
      items: [
        {
          createdAt: "2026-06-09T08:10:40.000Z",
          id: "row_1",
          meanings: [
            {
              createdAt: "2026-06-09T08:10:40.000Z",
              meaning: "직접 저장",
            },
          ],
          term: "nado-rest-save",
          type: "word",
          updatedAt: "2026-06-09T08:10:40.000Z",
        },
      ],
      nextCursor: null,
    });
  });

  it("inserts a new vocabulary item for a new normalized term", async () => {
    const store = new MemoryVocabularyStore();
    const service = createVocabularyService({
      now: () => "2026-06-09T00:00:00.000Z",
      store,
    });

    const item = await service.save("user_1", {
      meaning: "~인지 궁금하다",
      note: "정중한 질문에서 자주 쓰입니다.",
      term: "  Wonder   If  ",
      type: "phrase",
    });

    expect(item).toEqual({
      createdAt: "2026-06-09T00:00:00.000Z",
      id: "row_1",
      meanings: [
        {
          createdAt: "2026-06-09T00:00:00.000Z",
          meaning: "~인지 궁금하다",
          note: "정중한 질문에서 자주 쓰입니다.",
        },
      ],
      term: "Wonder If",
      type: "phrase",
      updatedAt: "2026-06-09T00:00:00.000Z",
    });
    expect(store.rows[0]?.normalized_term).toBe("wonder if");
  });

  it("merges a new meaning into an existing item", async () => {
    const store = new MemoryVocabularyStore([
      {
        created_at: "2026-06-09T00:00:00.000Z",
        id: "row_1",
        meanings: [
          {
            createdAt: "2026-06-09T00:00:00.000Z",
            meaning: "~인지 궁금하다",
            note: "정중한 질문입니다.",
          },
        ],
        normalized_term: "wonder if",
        term: "wonder if",
        type: "phrase",
        updated_at: "2026-06-09T00:00:00.000Z",
        user_id: "user_1",
      },
    ]);
    const service = createVocabularyService({
      now: () => "2026-06-09T00:10:00.000Z",
      store,
    });

    const item = await service.save("user_1", {
      meaning: "~인지 알고 싶다",
      term: "Wonder If",
      type: "phrase",
    });

    expect(item.meanings).toHaveLength(2);
    expect(item.updatedAt).toBe("2026-06-09T00:10:00.000Z");
  });

  it("does not add duplicate meaning and note pairs", async () => {
    const store = new MemoryVocabularyStore([
      {
        created_at: "2026-06-09T00:00:00.000Z",
        id: "row_1",
        meanings: [
          {
            createdAt: "2026-06-09T00:00:00.000Z",
            meaning: "~인지 궁금하다",
            note: "정중한 질문입니다.",
          },
        ],
        normalized_term: "wonder if",
        term: "wonder if",
        type: "phrase",
        updated_at: "2026-06-09T00:00:00.000Z",
        user_id: "user_1",
      },
    ]);
    const service = createVocabularyService({
      now: () => "2026-06-09T00:10:00.000Z",
      store,
    });

    const item = await service.save("user_1", {
      meaning: "~인지 궁금하다",
      note: "정중한 질문입니다.",
      term: "wonder if",
      type: "phrase",
    });

    expect(item.meanings).toHaveLength(1);
    expect(item.updatedAt).toBe("2026-06-09T00:00:00.000Z");
  });

  it("deletes only the requested user's item", async () => {
    const service = createVocabularyService({
      store: new MemoryVocabularyStore([
        {
          created_at: "2026-06-09T00:00:00.000Z",
          id: "row_1",
          meanings: [],
          normalized_term: "issue",
          term: "issue",
          type: "word",
          updated_at: "2026-06-09T00:00:00.000Z",
          user_id: "user_1",
        },
      ]),
    });

    await expect(service.delete("user_2", "row_1")).resolves.toBe(false);
    await expect(service.delete("user_1", "row_1")).resolves.toBe(true);
  });

  it("deletes only the selected meaning and returns the updated item", async () => {
    const store = new MemoryVocabularyStore([
      {
        created_at: "2026-06-09T00:00:00.000Z",
        id: "row_1",
        meanings: [
          {
            createdAt: "2026-06-09T00:00:00.000Z",
            meaning: "상태",
          },
          {
            createdAt: "2026-06-09T00:01:00.000Z",
            meaning: "지역 주",
          },
        ],
        normalized_term: "state",
        term: "state",
        type: "word",
        updated_at: "2026-06-09T00:01:00.000Z",
        user_id: "user_1",
      },
    ]);
    const service = createVocabularyService({ store });

    await expect(
      service.deleteMeaning("user_1", "row_1", {
        createdAt: "2026-06-09T00:00:00.000Z",
        meaning: "상태",
      }),
    ).resolves.toMatchObject({
      item: { meanings: [{ meaning: "지역 주" }] },
      itemDeleted: false,
    });
    expect(store.rows).toHaveLength(1);
  });

  it("deletes the vocabulary row when its last meaning is removed", async () => {
    const store = new MemoryVocabularyStore([
      {
        created_at: "2026-06-09T00:00:00.000Z",
        id: "row_1",
        meanings: [{ meaning: "상태" }],
        normalized_term: "state",
        term: "state",
        type: "word",
        updated_at: "2026-06-09T00:00:00.000Z",
        user_id: "user_1",
      },
    ]);
    const service = createVocabularyService({ store });

    await expect(
      service.deleteMeaning("user_1", "row_1", { meaning: "상태" }),
    ).resolves.toEqual({ item: null, itemDeleted: true });
    expect(store.rows).toEqual([]);
  });

  it("does not delete a missing meaning or another user's meaning", async () => {
    const service = createVocabularyService({
      store: new MemoryVocabularyStore([
        {
          created_at: "2026-06-09T00:00:00.000Z",
          id: "row_1",
          meanings: [{ meaning: "상태" }],
          normalized_term: "state",
          term: "state",
          type: "word",
          updated_at: "2026-06-09T00:00:00.000Z",
          user_id: "user_1",
        },
      ]),
    });

    await expect(
      service.deleteMeaning("user_2", "row_1", { meaning: "상태" }),
    ).resolves.toBeNull();
    await expect(
      service.deleteMeaning("user_1", "row_1", { meaning: "다른 뜻" }),
    ).resolves.toBeNull();
  });
});

function normalizeTerm(term: string): string {
  return term.trim().replace(/\s+/g, " ").toLowerCase();
}

function hasMeaning(
  meanings: VocabularyRow["meanings"],
  meaning: VocabularyRow["meanings"][number],
): boolean {
  return meanings.some(
    (candidate) =>
      candidate.meaning.trim() === meaning.meaning.trim() &&
      (candidate.note?.trim() ?? "") === (meaning.note?.trim() ?? ""),
  );
}
