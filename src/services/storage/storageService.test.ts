import { describe, expect, it } from 'vitest';
import { STORAGE_KEYS, STORAGE_VERSION } from '../../utils/constants';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  loadWords,
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
});
