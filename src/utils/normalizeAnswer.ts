/**
 * Normalize a spelling-test answer for comparison.
 *
 * - Unicode normalize (NFC)
 * - Trim leading/trailing whitespace
 * - Collapse internal whitespace
 * - Case-insensitive
 *
 * Does NOT strip accents, apostrophes, hyphens, or punctuation.
 */
export function normalizeAnswer(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}
