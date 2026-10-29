import { describe, expect, it } from 'vitest';
import { createSession, gradeAnswer } from '../test/testUtils';
import type { Collection } from './collectionTypes';
import {
  addErrors,
  collectGlobalErrors,
  createCollection,
  ownersFor,
  ownersForGlobalErrors,
  recordMistakes,
  removeErrors,
  restoreErrors,
  sortErrors,
  validateCollectionName,
} from './collectionUtils';

function sessionWith(results: Array<[string, string]>) {
  const s = createSession({
    words: results.map(([word]) => word),
    questionCount: 'all',
    timerEnabled: false,
    secondsPerWord: 0,
    language: 'en-US',
    voiceName: null,
    speechRate: 1,
    pitch: 1,
  });
  s.answers = results.map(([word, typed], i) => gradeAnswer(word, typed, i, 'submitted'));
  return s;
}

function collection(id: string, overrides: Partial<Collection> = {}): Collection {
  return { ...createCollection(id, 0, id), ...overrides };
}

describe('validateCollectionName', () => {
  const existing = [collection('a', { name: 'Week 1' })];

  it('rejects empty, too long and duplicate names', () => {
    expect(validateCollectionName('   ', existing)).toMatch(/enter a name/i);
    expect(validateCollectionName('x'.repeat(41), existing)).toMatch(/40 characters/);
    expect(validateCollectionName(' week  1 ', existing)).toMatch(/already exists/);
  });

  it('lets a collection keep its own name', () => {
    expect(validateCollectionName('Week 1', existing, 'a')).toBeNull();
    expect(validateCollectionName('Week 2', existing)).toBeNull();
  });
});

describe('frequent errors', () => {
  it('adds new words and counts repeat misses (case-insensitive)', () => {
    const first = addErrors([], ['Apple', 'banana'], 100);
    const next = addErrors(first, ['apple'], 200);
    expect(next).toEqual([
      { word: 'Apple', misses: 2, lastMissedAt: 200 },
      { word: 'banana', misses: 1, lastMissedAt: 100 },
    ]);
  });

  it('sorts most-missed first, then most recent', () => {
    const sorted = sortErrors([
      { word: 'a', misses: 1, lastMissedAt: 5 },
      { word: 'b', misses: 3, lastMissedAt: 1 },
      { word: 'c', misses: 1, lastMissedAt: 9 },
    ]);
    expect(sorted.map((e) => e.word)).toEqual(['b', 'c', 'a']);
  });

  it('removes only the chosen words and can put them back', () => {
    const errors = addErrors([], ['apple', 'banana'], 1);
    const removed = removeErrors(errors, ['APPLE']);
    expect(removed.map((e) => e.word)).toEqual(['banana']);
    expect(restoreErrors(removed, errors.slice(0, 1)).map((e) => e.word)).toEqual([
      'banana',
      'apple',
    ]);
  });

  it('does not overwrite a newer entry when restoring', () => {
    const newer = [{ word: 'apple', misses: 5, lastMissedAt: 9 }];
    const restored = restoreErrors(newer, [{ word: 'apple', misses: 1, lastMissedAt: 1 }]);
    expect(restored).toEqual(newer);
  });
});

describe('recordMistakes', () => {
  it('adds mistakes to the owning collection and never clears correct words', () => {
    const week = collection('week', {
      words: ['apple', 'banana'],
      errors: [{ word: 'banana', misses: 1, lastMissedAt: 1 }],
    });
    const other = collection('other', { words: ['apple'] });
    const session = sessionWith([
      ['apple', 'aple'],
      ['banana', 'banana'],
    ]);

    const [nextWeek, nextOther] = recordMistakes(
      [week, other],
      session,
      ownersFor(['apple', 'banana'], 'week'),
      50,
    );

    expect(nextWeek!.errors).toEqual([
      // Spelled correctly this time, but stays until removed by hand.
      { word: 'banana', misses: 1, lastMissedAt: 1 },
      { word: 'apple', misses: 1, lastMissedAt: 50 },
    ]);
    expect(nextOther).toBe(other);
  });

  it('sends a global-errors mistake to every collection the word came from', () => {
    const a = collection('a', { errors: [{ word: 'rhythm', misses: 2, lastMissedAt: 1 }] });
    const b = collection('b', { errors: [{ word: 'Rhythm', misses: 1, lastMissedAt: 1 }] });
    const c = collection('c', { words: ['rhythm'] });
    const owners = ownersForGlobalErrors(collectGlobalErrors([a, b, c]));

    const next = recordMistakes([a, b, c], sessionWith([['rhythm', 'rythm']]), owners, 7);

    expect(next[0]!.errors).toEqual([{ word: 'rhythm', misses: 3, lastMissedAt: 7 }]);
    expect(next[1]!.errors).toEqual([{ word: 'Rhythm', misses: 2, lastMissedAt: 7 }]);
    // Not in this collection's errors, so a global test doesn't add it there.
    expect(next[2]!.errors).toEqual([]);
  });

  it('ignores collections that were deleted during the test', () => {
    const a = collection('a');
    const next = recordMistakes([a], sessionWith([['apple', 'x']]), ownersFor(['apple'], 'gone'), 1);
    expect(next).toEqual([a]);
  });
});

describe('collectGlobalErrors', () => {
  it('lists each word once, sums misses and remembers where it came from', () => {
    const a = collection('a', {
      errors: [
        { word: 'apple', misses: 1, lastMissedAt: 0 },
        { word: 'banana', misses: 1, lastMissedAt: 0 },
      ],
    });
    const b = collection('b', { errors: [{ word: 'APPLE', misses: 2, lastMissedAt: 0 }] });

    expect(collectGlobalErrors([a, b])).toEqual([
      { word: 'apple', misses: 3, collectionIds: ['a', 'b'] },
      { word: 'banana', misses: 1, collectionIds: ['a'] },
    ]);
  });
});
