import { useCallback, useEffect, useState } from 'react';
import { useVoices } from '../../hooks/useVoices';
import type { SpeakOptions } from './speechTypes';
import { cancelSpeech, isSpeechSupported, speak } from './speechService';

export interface UseSpeechSynthesisResult {
  supported: boolean;
  voices: SpeechSynthesisVoice[];
  speaking: boolean;
  speak: (text: string, options?: SpeakOptions) => void;
  cancel: () => void;
}

/**
 * Thin React wrapper over the browser speechSynthesis API.
 *
 * Notes:
 *  - Calls `onStart`/`onEnd` from the underlying utterance events.
 *  - `cancel()` is exposed for cleanup.
 *  - `voices` is populated from `useVoices()` which listens to `voiceschanged`.
 */
export function useSpeechSynthesis(): UseSpeechSynthesisResult {
  const supported = isSpeechSupported();
  const voices = useVoices();
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      cancelSpeech();
    };
  }, []);

  const wrappedSpeak = useCallback((text: string, options: SpeakOptions = {}) => {
    const onStart = options.onStart;
    const onEnd = options.onEnd;
    const onError = options.onError;

    speak(text, {
      ...options,
      onStart: () => {
        setSpeaking(true);
        onStart?.();
      },
      onEnd: () => {
        setSpeaking(false);
        onEnd?.();
      },
      onError: (err) => {
        setSpeaking(false);
        onError?.(err);
      },
    });
  }, []);

  const cancel = useCallback(() => {
    cancelSpeech();
    setSpeaking(false);
  }, []);

  return {
    supported,
    voices,
    speaking,
    speak: wrappedSpeak,
    cancel,
  };
}