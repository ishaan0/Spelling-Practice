import { describe, expect, it } from 'vitest';
import { shuffle } from './shuffle';

describe('shuffle', () => {
  it('preserves length', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shuffle(arr)).toHaveLength(arr.length);
  });

  it('preserves all items', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const out = shuffle(arr);
    expect(out.slice().sort((a, b) => a - b)).toEqual(arr);
  });

  it('does not mutate the original array', () => {
    const arr = [1, 2, 3, 4, 5];
    const before = arr.slice();
    shuffle(arr);
    expect(arr).toEqual(before);
  });

  it('returns a new array', () => {
    const arr = [1, 2, 3];
    expect(shuffle(arr)).not.toBe(arr);
  });

  it('handles empty array', () => {
    expect(shuffle([])).toEqual([]);
  });

  it('handles single-element array', () => {
    expect(shuffle([42])).toEqual([42]);
  });
});