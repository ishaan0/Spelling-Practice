export const STORAGE_VERSION = 1;

export const STORAGE_KEYS = {
  words: 'spelling-practice:words',
  settings: 'spelling-practice:settings',
  missedWords: 'spelling-practice:missed-words',
  testHistory: 'spelling-practice:recent-tests',
} as const;

export const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_WORDS = 10_000;
export const MAX_WORD_LENGTH = 60;

export const MIN_CUSTOM_TIMER_SECONDS = 3;
export const MAX_CUSTOM_TIMER_SECONDS = 300;

export const MIN_SPEECH_RATE = 0.5;
export const MAX_SPEECH_RATE = 2.0;
export const DEFAULT_SPEECH_RATE = 1.0;

export const MIN_SPEECH_PITCH = 0;
export const MAX_SPEECH_PITCH = 2;
export const DEFAULT_SPEECH_PITCH = 1;

/** How long the "Correct" feedback stays up before moving on automatically. */
export const FEEDBACK_DELAY_CORRECT_MS = 1000;

/**
 * If the browser never reports that speech started (blocked, no voices, …)
 * the question is opened for answering after this long anyway.
 */
export const SPEECH_START_FALLBACK_MS = 1500;

export const SUPPORTED_LANGUAGES = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'en', label: 'English (any accent)' },
] as const;

export const TEST_LENGTH_PRESETS = [5, 10, 20, 30] as const;

export const TIMER_PRESETS_SECONDS = [5, 10, 15, 20, 30] as const;

export const SAMPLE_WORDS = [
  'accommodate',
  'necessary',
  'rhythm',
  'conscience',
  'definitely',
  'embarrass',
  'occurrence',
  'separate',
  'privilege',
  'maintenance',
  'recommend',
  'questionnaire',
] as const;
