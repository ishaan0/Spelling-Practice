import {
  DEFAULT_SPEECH_PITCH,
  DEFAULT_SPEECH_RATE,
  MAX_CUSTOM_TIMER_SECONDS,
  MAX_SPEECH_PITCH,
  MAX_SPEECH_RATE,
  MAX_WORDS,
  MIN_CUSTOM_TIMER_SECONDS,
  MIN_SPEECH_PITCH,
  MIN_SPEECH_RATE,
  STORAGE_KEYS,
  STORAGE_VERSION,
} from '../../utils/constants';
import { normalizeWordList } from '../../features/words/parseWords';
import type { TestSession } from '../../features/test/testTypes';

export interface PersistedSettings {
  language: string;
  voiceName: string | null;
  speechRate: number;
  pitch: number;
  timerEnabled: boolean;
  secondsPerWord: number;
  questionCount: number | 'all';
  shuffle: boolean;
}

export const DEFAULT_SETTINGS: PersistedSettings = {
  language: 'en-US',
  voiceName: null,
  speechRate: DEFAULT_SPEECH_RATE,
  pitch: DEFAULT_SPEECH_PITCH,
  timerEnabled: true,
  secondsPerWord: 15,
  questionCount: 20,
  shuffle: true,
};

interface Envelope<T> {
  version: number;
  data: T;
}

function read(key: string): unknown {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Envelope<unknown>> | null;
    if (!parsed || parsed.version !== STORAGE_VERSION) return null;
    return parsed.data ?? null;
  } catch {
    return null;
  }
}

/** Returns false when the value could not be saved (quota, private mode, …). */
function write<T>(key: string, data: T): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const envelope: Envelope<T> = { version: STORAGE_VERSION, data };
    window.localStorage.setItem(key, JSON.stringify(envelope));
    return true;
  } catch {
    return false;
  }
}

function readWordList(key: string): string[] {
  const value = read(key);
  if (!Array.isArray(value)) return [];
  const strings = value.filter((v): v is string => typeof v === 'string');
  return normalizeWordList(strings).words.slice(0, MAX_WORDS);
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function sanitizeSettings(value: unknown): PersistedSettings {
  if (value === null || typeof value !== 'object') return DEFAULT_SETTINGS;
  const v = value as Partial<Record<keyof PersistedSettings, unknown>>;
  const d = DEFAULT_SETTINGS;

  const questionCount: number | 'all' =
    v.questionCount === 'all'
      ? 'all'
      : typeof v.questionCount === 'number' && Number.isFinite(v.questionCount) && v.questionCount >= 1
        ? Math.floor(v.questionCount)
        : d.questionCount;

  return {
    language: typeof v.language === 'string' && v.language ? v.language : d.language,
    voiceName: typeof v.voiceName === 'string' && v.voiceName ? v.voiceName : null,
    speechRate: clamp(v.speechRate, MIN_SPEECH_RATE, MAX_SPEECH_RATE, d.speechRate),
    pitch: clamp(v.pitch, MIN_SPEECH_PITCH, MAX_SPEECH_PITCH, d.pitch),
    timerEnabled: typeof v.timerEnabled === 'boolean' ? v.timerEnabled : d.timerEnabled,
    secondsPerWord: Math.round(
      clamp(v.secondsPerWord, MIN_CUSTOM_TIMER_SECONDS, MAX_CUSTOM_TIMER_SECONDS, d.secondsPerWord),
    ),
    questionCount,
    shuffle: typeof v.shuffle === 'boolean' ? v.shuffle : d.shuffle,
  };
}

export function loadWords(): string[] {
  return readWordList(STORAGE_KEYS.words);
}

export function saveWords(words: string[]): boolean {
  return write(STORAGE_KEYS.words, words);
}

export function loadMissedWords(): string[] {
  return readWordList(STORAGE_KEYS.missedWords);
}

export function saveMissedWords(words: string[]): boolean {
  return write(STORAGE_KEYS.missedWords, words);
}

export function loadSettings(): PersistedSettings {
  return sanitizeSettings(read(STORAGE_KEYS.settings));
}

export function saveSettings(settings: PersistedSettings): boolean {
  return write(STORAGE_KEYS.settings, settings);
}

export function loadTestHistory(): TestSession[] {
  const value = read(STORAGE_KEYS.testHistory);
  return Array.isArray(value) ? (value as TestSession[]) : [];
}

export function saveTestHistory(history: TestSession[]): boolean {
  return write(STORAGE_KEYS.testHistory, history);
}
