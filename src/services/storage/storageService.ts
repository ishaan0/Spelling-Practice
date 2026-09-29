import {
  DEFAULT_SPEECH_PITCH,
  DEFAULT_SPEECH_RATE,
  STORAGE_KEYS,
  STORAGE_VERSION,
} from '../../utils/constants';
import type { TestSession } from '../../features/test/testTypes';

export interface PersistedSettings {
  language: string;
  voiceName: string | null;
  speechRate: number;
  pitch: number;
  timerEnabled: boolean;
  secondsPerWord: number;
  questionCount: number | 'all';
}

export const DEFAULT_SETTINGS: PersistedSettings = {
  language: 'en-US',
  voiceName: null,
  speechRate: DEFAULT_SPEECH_RATE,
  pitch: DEFAULT_SPEECH_PITCH,
  timerEnabled: true,
  secondsPerWord: 15,
  questionCount: 20,
};

interface Envelope<T> {
  version: number;
  data: T;
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Envelope<T>;
    if (parsed.version !== STORAGE_VERSION) return fallback;
    return parsed.data;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    const envelope: Envelope<T> = { version: STORAGE_VERSION, data };
    window.localStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // Quota exceeded or storage disabled; silently ignore.
  }
}

export function loadWords(): string[] {
  const value = read<string[] | null>(STORAGE_KEYS.words, null);
  return Array.isArray(value) ? value : [];
}

export function saveWords(words: string[]): void {
  write(STORAGE_KEYS.words, words);
}

export function loadSettings(): PersistedSettings {
  const value = read<PersistedSettings | null>(STORAGE_KEYS.settings, null);
  if (!value) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...value };
}

export function saveSettings(settings: PersistedSettings): void {
  write(STORAGE_KEYS.settings, settings);
}

export function loadTestHistory(): TestSession[] {
  const value = read<TestSession[] | null>(STORAGE_KEYS.testHistory, null);
  return Array.isArray(value) ? value : [];
}

export function saveTestHistory(history: TestSession[]): void {
  write(STORAGE_KEYS.testHistory, history);
}
