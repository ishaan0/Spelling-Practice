import { describe, expect, it } from 'vitest';
import { parseWordInput } from './parseWords';

describe('parseWordInput', () => {
  it('splits on newlines, commas, tabs, and semicolons', () => {
    const r = parseWordInput('apple, banana\norange\tgrape;pear');
    expect(r.words).toEqual(['apple', 'banana', 'orange', 'grape', 'pear']);
    expect(r.duplicatesRemoved).toBe(0);
    expect(r.emptyIgnored).toBe(0);
  });

  it('trims whitespace', () => {
    const r = parseWordInput('  hello   \n  world  ');
    expect(r.words).toEqual(['hello', 'world']);
  });

  it('removes duplicates preserving first occurrence casing', () => {
    const r = parseWordInput('Apple\napple\nAPPLE\nbanana');
    expect(r.words).toEqual(['Apple', 'banana']);
    expect(r.duplicatesRemoved).toBe(2);
  });

  it('ignores empty entries', () => {
    const r = parseWordInput('apple\n\n,, ,\nbanana');
    expect(r.words).toEqual(['apple', 'banana']);
    expect(r.emptyIgnored).toBeGreaterThan(0);
  });

  it('preserves apostrophes, hyphens, accents, and internal spaces', () => {
    const r = parseWordInput("can't\nwell-being\nrésumé\nmother-in-law\nNew York");
    expect(r.words).toEqual([
      "can't",
      'well-being',
      'résumé',
      'mother-in-law',
      'New York',
    ]);
  });

  it('preserves NFC unicode', () => {
    const decomposed = 'cafe\u0301'; // e + combining acute
    const r = parseWordInput(decomposed);
    // The parser applies NFC normalization internally
    expect(r.words[0]).toBe('café');
  });

  it('returns empty for empty input', () => {
    const r = parseWordInput('');
    expect(r.words).toEqual([]);
    expect(r.duplicatesRemoved).toBe(0);
  });

  it('handles mixed separators', () => {
    const r = parseWordInput('one;two,three\nfour\tfive;six');
    expect(r.words).toEqual(['one', 'two', 'three', 'four', 'five', 'six']);
  });
});