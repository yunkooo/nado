export function readTrustProxy(
  value: string | undefined,
): boolean | number | string {
  if (!value || value === "0" || value.toLowerCase() === "false") {
    return false;
  }

  if (value === "1" || value.toLowerCase() === "true") {
    return true;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isFinite(parsed) && String(parsed) === value) {
    return parsed;
  }

  return value;
}
