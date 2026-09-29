import { describe, expect, it } from 'vitest';
import { diffChars } from './diffChars';

describe('diffChars', () => {
  it('flags an extra letter in the typed answer', () => {
    const d = diffChars('bannana', 'banana');
    expect(d.typed.filter((p) => p.changed).map((p) => p.text)).toEqual(['n']);
    expect(d.expected.every((p) => !p.changed)).toBe(true);
    expect(d.typed.map((p) => p.text).join('')).toBe('bannana');
  });

  it('flags a missing letter in the expected word', () => {
    const d = diffChars('acommodate', 'accommodate');
    expect(d.expected.filter((p) => p.changed).map((p) => p.text)).toEqual(['c']);
    expect(d.typed.every((p) => !p.changed)).toBe(true);
  });

  it('flags swapped letters on both sides', () => {
    const d = diffChars('recieve', 'receive');
    expect(d.typed.some((p) => p.changed)).toBe(true);
    expect(d.expected.some((p) => p.changed)).toBe(true);
    expect(d.expected.map((p) => p.text).join('')).toBe('receive');
  });

  it('ignores case differences', () => {
    const d = diffChars('PARIS', 'Paris');
    expect(d.typed.every((p) => !p.changed)).toBe(true);
    expect(d.expected.every((p) => !p.changed)).toBe(true);
  });

  it('highlights nothing when there is nothing to compare', () => {
    const empty = diffChars('', 'cat');
    expect(empty.comparable).toBe(false);
    expect(empty.typed).toEqual([]);
    expect(empty.expected).toEqual([{ text: 'cat', changed: false }]);

    const unrelated = diffChars('xyz', 'cat');
    expect(unrelated.comparable).toBe(false);
    expect(unrelated.expected).toEqual([{ text: 'cat', changed: false }]);
    expect(unrelated.typed).toEqual([{ text: 'xyz', changed: false }]);
  });
});
