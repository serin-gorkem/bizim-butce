export function parsePositiveNumber(value: string) {
  const normalized = value.replace(",", ".").trim();
  const parsed = Number(normalized);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}
