export const DEFAULT_ANONYMOUS_DAILY_ANALYSIS_LIMIT = 3;
export const DEFAULT_AUTHENTICATED_DAILY_ANALYSIS_LIMIT = 20;

export type AnalysisDailyLimitOptions = {
  defaultValue: number;
  name: string;
};

export function readAnalysisDailyLimit(
  value: string | undefined,
  options: AnalysisDailyLimitOptions,
): number {
  if (value === undefined) {
    return options.defaultValue;
  }

  if (!/^\d+$/.test(value.trim())) {
    throw new Error(`${options.name} must be a non-negative integer.`);
  }

  return Number.parseInt(value, 10);
}
