import { describe, expect, it } from 'vitest';
import { normalizeAnswer } from './normalizeAnswer';

describe('normalizeAnswer', () => {
  it('matches case-insensitively', () => {
    expect(normalizeAnswer('Apple')).toBe(normalizeAnswer('apple'));
    expect(normalizeAnswer('BEAUTIFUL')).toBe(normalizeAnswer('beautiful'));
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeAnswer('  apple  ')).toBe(normalizeAnswer('apple'));
  });

  it('collapses internal whitespace', () => {
    expect(normalizeAnswer('New   York')).toBe(normalizeAnswer('New York'));
    expect(normalizeAnswer('\tNew\tYork\n')).toBe(normalizeAnswer('New York'));
  });

  it('preserves accents (resume vs résumé must differ)', () => {
    expect(normalizeAnswer('resume')).not.toBe(normalizeAnswer('résumé'));
  });

  it('preserves apostrophes', () => {
    expect(normalizeAnswer("can't")).toBe("can't");
    expect(normalizeAnswer("cant")).not.toBe(normalizeAnswer("can't"));
  });

  it('preserves hyphens', () => {
    expect(normalizeAnswer('well-being')).toBe('well-being');
    expect(normalizeAnswer('wellbeing')).not.toBe(normalizeAnswer('well-being'));
  });

  it('normalizes NFC unicode', () => {
    expect(normalizeAnswer('cafe\u0301')).toBe('café');
    expect(normalizeAnswer('café')).toBe('café');
  });
});