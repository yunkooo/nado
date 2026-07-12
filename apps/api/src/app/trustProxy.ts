export function readTrustProxy(
  value: string | undefined,
): boolean | number | string {
  const normalizedValue = value?.trim();

  if (
    !normalizedValue ||
    normalizedValue === "0" ||
    normalizedValue.toLowerCase() === "false"
  ) {
    return false;
  }

  if (normalizedValue.toLowerCase() === "true") {
    return true;
  }

  const parsed = Number.parseInt(normalizedValue, 10);

  if (Number.isFinite(parsed) && String(parsed) === normalizedValue) {
    return parsed;
  }

  return normalizedValue;
}
