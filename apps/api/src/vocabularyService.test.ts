import { describe, expect, it } from "vitest";
import {
  createVocabularyService,
  type NewVocabularyRow,
  type VocabularyRow,
  type VocabularyStore,
} from "./vocabularyService.js";

class MemoryVocabularyStore implements VocabularyStore {
  rows: VocabularyRow[];

  constructor(rows: VocabularyRow[] = []) {
    this.rows = rows;
  }

  async listByUser(userId: string): Promise<VocabularyRow[]> {
    return this.rows.filter((row) => row.user_id === userId);
  }

  async findByUserTerm(
    userId: string,
    normalizedTerm: string,
    type: "word" | "phrase",
  ): Promise<VocabularyRow | null> {
    return (
      this.rows.find(
        (row) =>
          row.user_id === userId &&
          row.normalized_term === normalizedTerm &&
          row.type === type,
      ) ?? null
    );
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
      const inserted = {
        ...row,
        id: `row_${this.rows.length + 1}`,
        normalized_term: normalizedTerm,
      };

      this.rows.push(inserted);

      return inserted;
    }

    if (!hasMeaning(existing.meanings, meaning)) {
      existing.meanings = [...existing.meanings, meaning];
      existing.updated_at = row.updated_at;
    }

    return existing;
  }

  async insert(row: NewVocabularyRow): Promise<VocabularyRow> {
    const inserted = {
      ...row,
      id: `row_${this.rows.length + 1}`,
      normalized_term: row.term.trim().replace(/\s+/g, " ").toLowerCase(),
    };

    this.rows.push(inserted);

    return inserted;
  }

  async updateMeanings(
    id: string,
    userId: string,
    meanings: VocabularyRow["meanings"],
    updatedAt: string,
  ): Promise<VocabularyRow | null> {
    const row = this.rows.find(
      (candidate) => candidate.id === id && candidate.user_id === userId,
    );

    if (!row) {
      return null;
    }

    row.meanings = meanings;
    row.updated_at = updatedAt;

    return row;
  }

  async deleteByUserId(id: string, userId: string): Promise<boolean> {
    const before = this.rows.length;
    this.rows = this.rows.filter(
      (row) => row.id !== id || row.user_id !== userId,
    );

    return this.rows.length < before;
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

    await expect(service.list("user_1")).resolves.toEqual([
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
    ]);
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

    await expect(service.list("user_1")).resolves.toEqual([
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
    ]);
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
