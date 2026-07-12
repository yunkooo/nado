export const DEFAULT_ANONYMOUS_DAILY_ANALYSIS_LIMIT = 0;
export const DEFAULT_AUTHENTICATED_DAILY_ANALYSIS_LIMIT = 0;
export const MAX_ANALYSIS_DAILY_LIMIT = 2_147_483_647;

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

  const normalizedValue = value.trim();
  const parsedValue = Number(normalizedValue);

  if (
    !/^\d+$/.test(normalizedValue) ||
    !Number.isSafeInteger(parsedValue) ||
    parsedValue > MAX_ANALYSIS_DAILY_LIMIT
  ) {
    throw new Error(
      `${options.name} must be a non-negative integer no greater than ${MAX_ANALYSIS_DAILY_LIMIT}.`,
    );
  }

  return parsedValue;
}
