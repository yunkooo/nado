export type UsageIdentity = {
  ipHash: string | null;
  userId: string | null;
};

export type AnalysisUsageRecord = {
  id: string;
  ipHash: string | null;
  periodStart: string;
  requestCount: number;
  userId: string | null;
};

export type AnalysisUsageStore = {
  findUsage(
    identity: UsageIdentity,
    periodStart: string,
  ): Promise<AnalysisUsageRecord | null>;
  insertUsage(
    identity: UsageIdentity,
    periodStart: string,
  ): Promise<AnalysisUsageRecord>;
  updateUsageCount(
    id: string,
    requestCount: number,
  ): Promise<AnalysisUsageRecord>;
};

export type AnalysisUsageServiceOptions = {
  anonymousDailyLimit?: number;
  authenticatedDailyLimit?: number;
  now?: () => Date;
  store: AnalysisUsageStore;
};

export type AnalysisUsageDecision =
  | {
      limit: number | null;
      ok: true;
      remaining: number | null;
      used: number;
    }
  | {
      limit: number;
      ok: false;
      retryAfterSeconds: number;
      used: number;
    };

export function createAnalysisUsageService(
  options: AnalysisUsageServiceOptions,
) {
  const now = options.now ?? (() => new Date());
  const store = options.store;
  const anonymousDailyLimit = options.anonymousDailyLimit ?? 0;
  const authenticatedDailyLimit = options.authenticatedDailyLimit ?? 0;

  return {
    async consume(identity: UsageIdentity): Promise<AnalysisUsageDecision> {
      if (!identity.userId && !identity.ipHash) {
        throw new Error("Analysis usage identity requires userId or ipHash.");
      }

      const currentTime = now();
      const periodStart = toUtcPeriodStart(currentTime);
      const limit = identity.userId
        ? authenticatedDailyLimit
        : anonymousDailyLimit;
      const existing = await store.findUsage(identity, periodStart);
      const currentCount = existing?.requestCount ?? 0;

      if (limit > 0 && currentCount >= limit) {
        return {
          limit,
          ok: false,
          retryAfterSeconds: secondsUntilNextUtcDay(currentTime),
          used: currentCount,
        };
      }

      const nextCount = currentCount + 1;

      if (existing) {
        await store.updateUsageCount(existing.id, nextCount);
      } else {
        await store.insertUsage(identity, periodStart);
      }

      return {
        limit: limit > 0 ? limit : null,
        ok: true,
        remaining: limit > 0 ? Math.max(limit - nextCount, 0) : null,
        used: nextCount,
      };
    },
  };
}

function toUtcPeriodStart(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function secondsUntilNextUtcDay(date: Date): number {
  const nextDay = new Date(date);
  nextDay.setUTCHours(24, 0, 0, 0);

  return Math.ceil((nextDay.getTime() - date.getTime()) / 1000);
}
