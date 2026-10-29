import { describe, expect, it } from 'vitest';
import { STORAGE_KEYS, STORAGE_VERSION } from '../../utils/constants';
import {
  DEFAULT_SETTINGS,
  loadCollections,
  loadSettings,
  loadWords,
  saveCollections,
  saveMissedWords,
  saveWords,
} from './storageService';

function put(key: string, data: unknown, version = STORAGE_VERSION) {
  window.localStorage.setItem(key, JSON.stringify({ version, data }));
}

describe('storageService', () => {
  it('round-trips the word list', () => {
    expect(saveWords(['apple', 'New York'])).toBe(true);
    expect(loadWords()).toEqual(['apple', 'New York']);
  });

  it('returns an empty list for missing, corrupt or outdated data', () => {
    expect(loadWords()).toEqual([]);
    window.localStorage.setItem(STORAGE_KEYS.words, '{not json');
    expect(loadWords()).toEqual([]);
    put(STORAGE_KEYS.words, ['apple'], STORAGE_VERSION + 1);
    expect(loadWords()).toEqual([]);
  });

  it('drops non-string, blank and duplicate entries when loading words', () => {
    put(STORAGE_KEYS.words, ['apple', 42, null, '  ', 'Apple', ' pear ']);
    expect(loadWords()).toEqual(['apple', 'pear']);
  });

  it('falls back to defaults for invalid settings and clamps numbers', () => {
    put(STORAGE_KEYS.settings, {
      speechRate: 99,
      secondsPerWord: -5,
      questionCount: 'lots',
      timerEnabled: 'yes',
    });
    const s = loadSettings();
    expect(s.speechRate).toBe(2);
    expect(s.secondsPerWord).toBe(3);
    expect(s.questionCount).toBe(DEFAULT_SETTINGS.questionCount);
    expect(s.timerEnabled).toBe(DEFAULT_SETTINGS.timerEnabled);
    expect(s.language).toBe('en-US');
  });

  it('reads break settings and keeps them in range', () => {
    expect(loadSettings().breaksEnabled).toBe(false);
    put(STORAGE_KEYS.settings, { breaksEnabled: true, wordsPerBreak: 0.5 });
    expect(loadSettings()).toMatchObject({ breaksEnabled: true, wordsPerBreak: 1 });
    put(STORAGE_KEYS.settings, { wordsPerBreak: 'ten' });
    expect(loadSettings().wordsPerBreak).toBe(DEFAULT_SETTINGS.wordsPerBreak);
  });

  it('turns the old single word list and missed words into the first collection', () => {
    saveWords(['apple', 'banana']);
    saveMissedWords(['banana']);

    const [first, ...rest] = loadCollections();

    expect(rest).toEqual([]);
    expect(first).toMatchObject({
      id: 'default',
      name: 'My words',
      words: ['apple', 'banana'],
      errors: [{ word: 'banana', misses: 1, lastMissedAt: 0 }],
    });
  });

  it('always has at least one collection', () => {
    expect(loadCollections()).toHaveLength(1);
    put(STORAGE_KEYS.collections, []);
    expect(loadCollections()).toHaveLength(1);
  });

  it('round-trips collections and cleans up invalid entries', () => {
    const now = 1000;
    saveCollections([
      { id: 'a', name: 'Week 1', words: ['apple'], errors: [{ word: 'apple', misses: 2, lastMissedAt: now }], createdAt: now },
    ]);
    expect(loadCollections()[0]).toMatchObject({ id: 'a', name: 'Week 1', words: ['apple'] });

    put(STORAGE_KEYS.collections, [
      { id: 'a', name: '  Week   1 ', words: ['apple', 'Apple', 7], errors: [{ word: 'apple', misses: -3 }, { word: 'APPLE', misses: 4 }, 'x'] },
      { id: 'a', name: 'Duplicate id' },
      { name: 'No id' },
      { id: 'b' },
    ]);
    expect(loadCollections()).toEqual([
      { id: 'a', name: 'Week 1', words: ['apple'], errors: [{ word: 'apple', misses: 1, lastMissedAt: 0 }], createdAt: 0 },
      { id: 'b', name: 'Untitled', words: [], errors: [], createdAt: 0 },
    ]);
  });
});
