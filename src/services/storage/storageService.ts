import {
  DEFAULT_SPEECH_PITCH,
  DEFAULT_SPEECH_RATE,
  MAX_COLLECTIONS,
  MAX_COLLECTION_NAME_LENGTH,
  MAX_CUSTOM_TIMER_SECONDS,
  MAX_SPEECH_PITCH,
  MAX_SPEECH_RATE,
  MAX_WORD_LENGTH,
  MAX_WORDS,
  MIN_CUSTOM_TIMER_SECONDS,
  MIN_SPEECH_PITCH,
  MIN_SPEECH_RATE,
  STORAGE_KEYS,
  STORAGE_VERSION,
} from '../../utils/constants';
import { cleanWord, normalizeWordList } from '../../features/words/parseWords';
import type { TestSession } from '../../features/test/testTypes';
import type { Collection, FrequentError } from '../../features/collections/collectionTypes';
import {
  cleanCollectionName,
  createCollection,
  DEFAULT_COLLECTION_ID,
  DEFAULT_COLLECTION_NAME,
} from '../../features/collections/collectionUtils';

export interface PersistedSettings {
  language: string;
  voiceName: string | null;
  speechRate: number;
  pitch: number;
  timerEnabled: boolean;
  secondsPerWord: number;
  questionCount: number | 'all';
  shuffle: boolean;
  breaksEnabled: boolean;
  /** Words answered between two breaks. */
  wordsPerBreak: number;
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
  breaksEnabled: false,
  wordsPerBreak: 20,
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
    breaksEnabled: typeof v.breaksEnabled === 'boolean' ? v.breaksEnabled : d.breaksEnabled,
    wordsPerBreak: Math.floor(clamp(v.wordsPerBreak, 1, MAX_WORDS, d.wordsPerBreak)),
  };
}

function sanitizeErrors(value: unknown): FrequentError[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: FrequentError[] = [];
  for (const item of value) {
    if (item === null || typeof item !== 'object') continue;
    const e = item as Partial<Record<keyof FrequentError, unknown>>;
    if (typeof e.word !== 'string') continue;
    const word = cleanWord(e.word);
    const key = word.toLowerCase();
    if (!word || word.length > MAX_WORD_LENGTH || seen.has(key)) continue;
    seen.add(key);
    out.push({
      word,
      misses: Math.floor(clamp(e.misses, 1, Number.MAX_SAFE_INTEGER, 1)),
      lastMissedAt: clamp(e.lastMissedAt, 0, Number.MAX_SAFE_INTEGER, 0),
    });
  }
  return out.slice(0, MAX_WORDS);
}

/** Returns null when the value isn't a list of collections at all. */
export function sanitizeCollections(value: unknown): Collection[] | null {
  if (!Array.isArray(value)) return null;
  const ids = new Set<string>();
  const out: Collection[] = [];
  for (const item of value) {
    if (item === null || typeof item !== 'object') continue;
    const c = item as Partial<Record<keyof Collection, unknown>>;
    if (typeof c.id !== 'string' || !c.id || ids.has(c.id)) continue;
    ids.add(c.id);
    const name =
      typeof c.name === 'string'
        ? cleanCollectionName(c.name).slice(0, MAX_COLLECTION_NAME_LENGTH)
        : '';
    const words = Array.isArray(c.words)
      ? c.words.filter((w): w is string => typeof w === 'string')
      : [];
    out.push({
      id: c.id,
      name: name || 'Untitled',
      words: normalizeWordList(words).words.slice(0, MAX_WORDS),
      errors: sanitizeErrors(c.errors),
      createdAt: clamp(c.createdAt, 0, Number.MAX_SAFE_INTEGER, 0),
    });
  }
  return out.slice(0, MAX_COLLECTIONS);
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

/**
 * Earlier versions kept a single word list and a list of missed words. When
 * there are no collections yet, those become the first collection.
 */
function migrateLegacyWords(): Collection {
  const collection = createCollection(DEFAULT_COLLECTION_NAME, 0, DEFAULT_COLLECTION_ID);
  return {
    ...collection,
    words: loadWords(),
    errors: loadMissedWords().map((word) => ({ word, misses: 1, lastMissedAt: 0 })),
  };
}

/** Always returns at least one collection. */
export function loadCollections(): Collection[] {
  const collections = sanitizeCollections(read(STORAGE_KEYS.collections));
  if (collections === null) return [migrateLegacyWords()];
  if (collections.length === 0) {
    return [createCollection(DEFAULT_COLLECTION_NAME, 0, DEFAULT_COLLECTION_ID)];
  }
  return collections;
}

export function saveCollections(collections: Collection[]): boolean {
  return write(STORAGE_KEYS.collections, collections);
}

export function loadActiveCollectionId(): string | null {
  const value = read(STORAGE_KEYS.activeCollection);
  return typeof value === 'string' && value ? value : null;
}

export function saveActiveCollectionId(id: string | null): boolean {
  return write(STORAGE_KEYS.activeCollection, id);
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
