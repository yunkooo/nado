import { describe, expect, it } from "vitest";
import {
  createAnalysisUsageService,
  type AnalysisUsageConsumeResult,
  type AnalysisUsageRecord,
  type AnalysisUsageStore,
  type UsageIdentity,
} from "./analysisUsageService.js";

class MemoryAnalysisUsageStore implements AnalysisUsageStore {
  records: AnalysisUsageRecord[] = [];
  consumptions: Array<{
    identity: UsageIdentity;
    limit: number;
    periodStart: string;
  }> = [];

  async consumeUsage(
    identity: UsageIdentity,
    periodStart: string,
    limit: number,
  ): Promise<AnalysisUsageConsumeResult> {
    this.consumptions.push({ identity, limit, periodStart });

    const record = this.records.find(
      (candidate) =>
        candidate.periodStart === periodStart &&
        candidate.userId === identity.userId &&
        candidate.ipHash === identity.ipHash,
    );

    if (record) {
      if (limit > 0 && record.requestCount >= limit) {
        return {
          consumed: false,
          requestCount: record.requestCount,
        };
      }

      record.requestCount += 1;

      return {
        consumed: true,
        requestCount: record.requestCount,
      };
    }

    const inserted = {
      id: `usage_${this.records.length + 1}`,
      ipHash: identity.ipHash,
      periodStart,
      requestCount: 1,
      userId: identity.userId,
    };

    this.records.push(inserted);

    return {
      consumed: true,
      requestCount: inserted.requestCount,
    };
  }
}

describe("createAnalysisUsageService", () => {
  it("records anonymous usage without blocking when the limit is disabled", async () => {
    const store = new MemoryAnalysisUsageStore();
    const service = createAnalysisUsageService({
      anonymousDailyLimit: 0,
      now: () => new Date("2026-06-09T12:00:00.000Z"),
      store,
    });

    await expect(
      service.consume({ ipHash: "ip_hash", userId: null }),
    ).resolves.toEqual({
      limit: null,
      ok: true,
      remaining: null,
      used: 1,
    });
    expect(store.records).toEqual([
      {
        id: "usage_1",
        ipHash: "ip_hash",
        periodStart: "2026-06-09",
        requestCount: 1,
        userId: null,
      },
    ]);
    expect(store.consumptions[0]?.limit).toBe(0);
  });

  it("increments existing authenticated usage and reports remaining allowance", async () => {
    const store = new MemoryAnalysisUsageStore();
    store.records.push({
      id: "usage_1",
      ipHash: null,
      periodStart: "2026-06-09",
      requestCount: 1,
      userId: "user_1",
    });
    const service = createAnalysisUsageService({
      authenticatedDailyLimit: 3,
      now: () => new Date("2026-06-09T12:00:00.000Z"),
      store,
    });

    await expect(
      service.consume({ ipHash: null, userId: "user_1" }),
    ).resolves.toEqual({
      limit: 3,
      ok: true,
      remaining: 1,
      used: 2,
    });
    expect(store.consumptions[0]?.limit).toBe(3);
  });

  it("blocks anonymous usage after the configured daily limit", async () => {
    const store = new MemoryAnalysisUsageStore();
    store.records.push({
      id: "usage_1",
      ipHash: "ip_hash",
      periodStart: "2026-06-09",
      requestCount: 2,
      userId: null,
    });
    const service = createAnalysisUsageService({
      anonymousDailyLimit: 2,
      now: () => new Date("2026-06-09T12:00:00.000Z"),
      store,
    });

    await expect(
      service.consume({ ipHash: "ip_hash", userId: null }),
    ).resolves.toEqual({
      limit: 2,
      ok: false,
      retryAfterSeconds: 43200,
      used: 2,
    });
    expect(store.records[0]?.requestCount).toBe(2);
  });
});
