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
 *  - `speak` and `cancel` are stable, so they are safe in effect dependencies.
 *  - Speech is cancelled when the component unmounts.
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
    speak(text, {
      ...options,
      onStart: () => {
        setSpeaking(true);
        options.onStart?.();
      },
      onEnd: () => {
        setSpeaking(false);
        options.onEnd?.();
      },
      onError: (err) => {
        setSpeaking(false);
        options.onError?.(err);
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
