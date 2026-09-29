import { afterEach, describe, expect, it, vi } from 'vitest';
import { cancelSpeech, pickVoice, speak, voiceMatchesLanguage } from './speechService';
import { __getPendingUtterances } from '../../test/mocks/speechSynthesis';

function voice(name: string, lang: string, extra: Partial<SpeechSynthesisVoice> = {}) {
  return { name, lang, default: false, localService: false, voiceURI: name, ...extra } as SpeechSynthesisVoice;
}

describe('pickVoice', () => {
  const voices = [
    voice('Hans', 'de-DE'),
    voice('Daniel', 'en-GB'),
    voice('Alex', 'en-US'),
    voice('Android', 'en_US'),
  ];

  it('uses the chosen voice when it exists', () => {
    expect(pickVoice(voices, 'Daniel', 'en-US')?.name).toBe('Daniel');
  });

  it('falls back to the language when the chosen voice is gone', () => {
    expect(pickVoice(voices, 'Missing', 'en-US')?.name).toBe('Alex');
  });

  it('prefers the exact accent, then any voice of the language', () => {
    expect(pickVoice(voices, null, 'en-GB')?.name).toBe('Daniel');
    expect(pickVoice(voices, null, 'en-AU')?.name).toBe('Daniel');
    expect(pickVoice(voices, null, 'en')?.name).toBe('Daniel');
  });

  it('returns null when nothing matches', () => {
    expect(pickVoice(voices, null, 'fr-FR')).toBeNull();
    expect(pickVoice([], null, 'en-US')).toBeNull();
  });

  it('matches languages regardless of separator and case', () => {
    expect(voiceMatchesLanguage(voice('Android', 'en_US'), 'en-GB')).toBe(true);
    expect(voiceMatchesLanguage(voice('Hans', 'de-DE'), 'en')).toBe(false);
  });
});

describe('speak', () => {
  it('does not report cancellation as an error', () => {
    const onError = vi.fn();
    const onEnd = vi.fn();
    speak('apple', { onError, onEnd });
    const utterance = __getPendingUtterances().at(-1) as unknown as {
      onerror: (e: { error: string }) => void;
    };
    utterance.onerror({ error: 'interrupted' });
    expect(onError).not.toHaveBeenCalled();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('ignores events from an utterance that has been replaced', () => {
    const onStart = vi.fn();
    speak('apple', { onStart });
    const first = __getPendingUtterances().at(-1) as unknown as { onstart: () => void };
    speak('banana');
    first.onstart();
    expect(onStart).not.toHaveBeenCalled();
  });

  it('waits a moment before speaking right after a cancel', () => {
    vi.useFakeTimers();
    cancelSpeech();
    speak('apple');
    expect(__getPendingUtterances()).toHaveLength(0);
    vi.advanceTimersByTime(100);
    expect(__getPendingUtterances().map((u) => u.text)).toEqual(['apple']);
  });

  it('only speaks the latest word when called in quick succession', () => {
    vi.useFakeTimers();
    cancelSpeech();
    speak('apple');
    speak('banana');
    vi.advanceTimersByTime(100);
    expect(__getPendingUtterances().map((u) => u.text)).toEqual(['banana']);
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});
