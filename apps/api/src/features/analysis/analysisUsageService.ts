export type UsageIdentity = {
  ipHash: string | null;
  userId: string | null;
};

export type AnalysisUsageConsumeResult = {
  consumed: boolean;
  requestCount: number;
};

export type AnalysisUsageStore = {
  consumeUsage(
    identity: UsageIdentity,
    periodStart: string,
    limit: number,
  ): Promise<AnalysisUsageConsumeResult>;
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
      const usage = await store.consumeUsage(identity, periodStart, limit);

      if (!usage.consumed) {
        return {
          limit,
          ok: false,
          retryAfterSeconds: secondsUntilNextUtcDay(currentTime),
          used: usage.requestCount,
        };
      }

      return {
        limit: limit > 0 ? limit : null,
        ok: true,
        remaining: limit > 0 ? Math.max(limit - usage.requestCount, 0) : null,
        used: usage.requestCount,
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
