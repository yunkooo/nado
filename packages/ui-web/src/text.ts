export function countVisibleTextCharacters(text: string): number {
  return Array.from(text.normalize("NFKC").trim()).length;
}
