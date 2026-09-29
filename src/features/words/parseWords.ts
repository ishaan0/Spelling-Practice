export interface ParseResult {
  words: string[];
  duplicatesRemoved: number;
  emptyIgnored: number;
}

const SPLIT_REGEX = /[\n,;\t]+/g;

/**
 * Parse a free-form word list.
 *
 * Splits on newlines, commas, tabs, and semicolons.
 * Trims entries, ignores empties, deduplicates while preserving the first
 * occurrence's exact spelling/punctuation (apostrophes, hyphens, accents).
 * Unicode-normalizes via NFC.
 */
export function parseWordInput(input: string): ParseResult {
  const raw = input.normalize('NFC');
  const tokens = raw
    .split(SPLIT_REGEX)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const emptyIgnored = Math.max(
    0,
    raw.split(SPLIT_REGEX).filter((t) => t.trim().length === 0).length,
  );

  const seen = new Set<string>();
  const words: string[] = [];
  let duplicatesRemoved = 0;

  for (const token of tokens) {
    const key = token.toLowerCase();
    if (seen.has(key)) {
      duplicatesRemoved += 1;
      continue;
    }
    seen.add(key);
    words.push(token);
  }

  return { words, duplicatesRemoved, emptyIgnored };
}
