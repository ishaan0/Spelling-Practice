import { describe, expect, it } from 'vitest';
import { parseJsonWords, parseWordInput } from './parseWords';

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
describe('parseWordInput clean-up', () => {
  it('strips a byte-order mark and handles Windows / old Mac line endings', () => {
    const r = parseWordInput('﻿apple\r\nbanana\rcherry');
    expect(r.words).toEqual(['apple', 'banana', 'cherry']);
  });

  it('strips list markers and wrapping quotes', () => {
    const r = parseWordInput('1. apple\n2) banana\n- cherry\n• grape\n"New York"');
    expect(r.words).toEqual(['apple', 'banana', 'cherry', 'grape', 'New York']);
  });

  it('keeps leading hyphens that are part of the word', () => {
    expect(parseWordInput('-ing').words).toEqual(['-ing']);
  });

  it('skips entries that are too long to be a word', () => {
    const r = parseWordInput(`apple\n${'x'.repeat(80)}`);
    expect(r.words).toEqual(['apple']);
    expect(r.tooLongIgnored).toBe(1);
  });
});

describe('parseJsonWords', () => {
  it('accepts arrays of strings, arrays of objects and { words }', () => {
    expect(parseJsonWords('["apple", " banana "]')?.words).toEqual(['apple', 'banana']);
    expect(parseJsonWords('[{"word":"apple"},{"word":"Apple"}]')?.words).toEqual(['apple']);
    expect(parseJsonWords('{"words":["apple","cherry"]}')?.words).toEqual(['apple', 'cherry']);
  });

  it('rejects invalid or unsupported JSON', () => {
    expect(parseJsonWords('not json')).toBeNull();
    expect(parseJsonWords('{"items":["a"]}')).toBeNull();
    expect(parseJsonWords('[1, 2, 3]')).toBeNull();
  });
});
