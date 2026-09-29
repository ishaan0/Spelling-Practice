import { MAX_WORD_LENGTH } from '../../utils/constants';

export interface ParseResult {
  words: string[];
  duplicatesRemoved: number;
  emptyIgnored: number;
  /** Entries skipped because they are too long to be a word or short phrase. */
  tooLongIgnored: number;
}

const SPLIT_REGEX = /[\r\n,;\t]+/g;
// "1. word", "2) word", "- word", "• word" — list markers left over from a paste.
const LIST_MARKER_REGEX = /^(?:[-*•‣◦·]|\d{1,4}[.)])\s+/;
const WRAPPING_QUOTES_REGEX = /^(["“”])(.*)\1$|^“(.*)”$/;

/**
 * Clean up a single entry: NFC-normalize, trim, collapse internal whitespace,
 * drop list markers and wrapping double quotes (CSV exports).
 * Returns an empty string when nothing usable is left.
 */
export function cleanWord(raw: string): string {
  let word = raw.normalize('NFC').replace(/﻿/g, '').replace(/\s+/g, ' ').trim();
  word = word.replace(LIST_MARKER_REGEX, '');
  const quoted = WRAPPING_QUOTES_REGEX.exec(word);
  if (quoted) word = (quoted[2] ?? quoted[3] ?? '').trim();
  return word;
}

/** Case-insensitive de-duplication that keeps the first spelling seen. */
export function dedupeWords(words: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const word of words) {
    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(word);
  }
  return out;
}

/** Clean, validate and de-duplicate a list of raw entries. */
export function normalizeWordList(entries: readonly string[]): ParseResult {
  let emptyIgnored = 0;
  let tooLongIgnored = 0;
  const cleaned: string[] = [];

  for (const entry of entries) {
    const word = cleanWord(entry);
    if (word.length === 0) {
      emptyIgnored += 1;
    } else if (word.length > MAX_WORD_LENGTH) {
      tooLongIgnored += 1;
    } else {
      cleaned.push(word);
    }
  }

  const words = dedupeWords(cleaned);
  return {
    words,
    duplicatesRemoved: cleaned.length - words.length,
    emptyIgnored,
    tooLongIgnored,
  };
}

/**
 * Parse a free-form word list.
 *
 * Splits on newlines, commas, tabs, and semicolons.
 * Trims entries, ignores empties, deduplicates while preserving the first
 * occurrence's exact spelling/punctuation (apostrophes, hyphens, accents).
 * Unicode-normalizes via NFC.
 */
export function parseWordInput(input: string): ParseResult {
  if (input.trim().length === 0) {
    return { words: [], duplicatesRemoved: 0, emptyIgnored: 0, tooLongIgnored: 0 };
  }
  return normalizeWordList(input.split(SPLIT_REGEX));
}

/**
 * Parse the contents of a JSON file. Supported shapes:
 * `["a", "b"]`, `[{ "word": "a" }]`, `{ "words": [...] }`.
 * Returns null when the JSON is invalid or has another shape.
 */
export function parseJsonWords(text: string): ParseResult | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.replace(/^﻿/, ''));
  } catch {
    return null;
  }

  const list =
    parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) && 'words' in parsed
      ? (parsed as { words: unknown }).words
      : parsed;
  if (!Array.isArray(list)) return null;

  const entries: string[] = [];
  for (const item of list) {
    if (typeof item === 'string') {
      entries.push(item);
    } else if (
      item !== null &&
      typeof item === 'object' &&
      'word' in item &&
      typeof (item as { word: unknown }).word === 'string'
    ) {
      entries.push((item as { word: string }).word);
    } else {
      return null;
    }
  }
  return normalizeWordList(entries);
}
