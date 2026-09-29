import type { SpeakOptions } from './speechTypes';

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Speak text using the configured voice.
 * Calls `onStart` when the browser starts speaking.
 * Calls `onEnd` when finished, cancelled, or errored.
 */
export function speak(text: string, options: SpeakOptions = {}): void {
  if (!isSpeechSupported()) {
    options.onError?.(new Error('Speech synthesis is not supported in this browser.'));
    return;
  }

  const synth = window.speechSynthesis;
  // Cancel anything currently queued so we never stack utterances.
  synth.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  if (options.voice) utter.voice = options.voice;
  if (options.lang) utter.lang = options.lang;
  if (typeof options.rate === 'number') utter.rate = options.rate;
  if (typeof options.pitch === 'number') utter.pitch = options.pitch;
  if (typeof options.volume === 'number') utter.volume = options.volume;

  utter.onstart = () => {
    options.onStart?.();
  };
  utter.onend = () => {
    options.onEnd?.();
  };
  utter.onerror = (event) => {
    // 'canceled' / 'interrupted' are expected from our own cancel() calls
    options.onError?.(event);
  };

  synth.speak(utter);
}

export function cancelSpeech(): void {
  if (!isSpeechSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // Ignore — some browsers throw if nothing is playing
  }
}
