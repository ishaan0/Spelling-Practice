import type { SpeakOptions } from './speechTypes';

export function isSpeechSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined'
  );
}

// Chrome drops an utterance that is queued in the same tick as cancel().
const RESTART_DELAY_MS = 60;

// Bumped on every speak()/cancel() so callbacks from replaced utterances are ignored.
let generation = 0;
let pendingStart: number | null = null;
let lastCancelAt = Number.NEGATIVE_INFINITY;
// Held so the utterance can't be garbage-collected before its events fire (Chrome).
const keepAlive: { utterance: SpeechSynthesisUtterance | null } = { utterance: null };

function clearPendingStart() {
  if (pendingStart !== null) {
    window.clearTimeout(pendingStart);
    pendingStart = null;
  }
}

/**
 * Speak text, replacing anything that is currently being spoken.
 * Calls `onStart` when the browser starts speaking, `onEnd` when it finishes
 * and `onError` when playback genuinely fails.
 */
export function speak(text: string, options: SpeakOptions = {}): void {
  if (!isSpeechSupported()) {
    options.onError?.(new Error('Speech synthesis is not supported in this browser.'));
    return;
  }

  const synth = window.speechSynthesis;
  const id = ++generation;
  clearPendingStart();

  const utter = new SpeechSynthesisUtterance(text);
  if (options.voice) {
    utter.voice = options.voice;
    utter.lang = options.voice.lang;
  } else if (options.lang) {
    utter.lang = options.lang;
  }
  if (typeof options.rate === 'number') utter.rate = options.rate;
  if (typeof options.pitch === 'number') utter.pitch = options.pitch;
  if (typeof options.volume === 'number') utter.volume = options.volume;

  utter.onstart = () => {
    if (id === generation) options.onStart?.();
  };
  utter.onend = () => {
    if (id !== generation) return;
    keepAlive.utterance = null;
    options.onEnd?.();
  };
  utter.onerror = (event) => {
    if (id !== generation) return;
    keepAlive.utterance = null;
    const reason = (event as SpeechSynthesisErrorEvent | undefined)?.error;
    if (reason === 'canceled' || reason === 'interrupted') {
      options.onEnd?.();
      return;
    }
    options.onError?.(event);
  };

  const start = () => {
    pendingStart = null;
    if (id !== generation) return;
    keepAlive.utterance = utter;
    try {
      // A paused queue never starts speaking.
      if (synth.paused) synth.resume();
      synth.speak(utter);
    } catch (err) {
      keepAlive.utterance = null;
      options.onError?.(err);
    }
  };

  if (synth.speaking || synth.pending) {
    synth.cancel();
    lastCancelAt = performance.now();
  }
  const wait = RESTART_DELAY_MS - (performance.now() - lastCancelAt);
  if (wait > 0) {
    pendingStart = window.setTimeout(start, wait);
  } else {
    start();
  }
}

export function cancelSpeech(): void {
  generation += 1;
  keepAlive.utterance = null;
  if (typeof window === 'undefined') return;
  clearPendingStart();
  if (!isSpeechSupported()) return;
  try {
    window.speechSynthesis.cancel();
    lastCancelAt = performance.now();
  } catch {
    // Ignore — some browsers throw if nothing is playing
  }
}

/** Forget earlier activity so the next speak() starts straight away. Used by tests. */
export function resetSpeechState(): void {
  generation += 1;
  keepAlive.utterance = null;
  lastCancelAt = Number.NEGATIVE_INFINITY;
  if (typeof window !== 'undefined') clearPendingStart();
}

function normalizeLang(lang: string): string {
  return lang.replace(/_/g, '-').toLowerCase();
}

/** True when the voice speaks the language (`en` matches `en-US`, `en_GB`, …). */
export function voiceMatchesLanguage(voice: SpeechSynthesisVoice, language: string): boolean {
  const voiceLang = normalizeLang(voice.lang);
  const wanted = normalizeLang(language);
  const base = wanted.split('-')[0] ?? wanted;
  return voiceLang === base || voiceLang.startsWith(`${base}-`);
}

/**
 * Pick the voice to use: the one the user chose if it is still installed,
 * otherwise the best match for the language (exact accent first).
 * Returns null to let the browser decide.
 */
export function pickVoice(
  voices: readonly SpeechSynthesisVoice[],
  voiceName: string | null,
  language: string,
): SpeechSynthesisVoice | null {
  if (voiceName) {
    const chosen = voices.find((v) => v.name === voiceName);
    if (chosen) return chosen;
  }
  const wanted = normalizeLang(language);
  const exact = voices.filter((v) => normalizeLang(v.lang) === wanted);
  const related = voices.filter((v) => voiceMatchesLanguage(v, language));
  for (const pool of [exact, related]) {
    const best = pool.find((v) => v.default) ?? pool.find((v) => v.localService) ?? pool[0];
    if (best) return best;
  }
  return null;
}
