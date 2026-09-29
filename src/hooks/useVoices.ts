import { useEffect, useState } from 'react';

function readVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  try {
    return window.speechSynthesis.getVoices();
  } catch {
    return [];
  }
}

/** The browser's speech voices. They usually load asynchronously. */
export function useVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(readVoices);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    const update = () => setVoices(readVoices());

    update();
    // Safari < 16 has no addEventListener on speechSynthesis.
    if (typeof synth.addEventListener === 'function') {
      synth.addEventListener('voiceschanged', update);
      return () => synth.removeEventListener('voiceschanged', update);
    }
    const poll = window.setInterval(() => {
      if (readVoices().length > 0) {
        update();
        window.clearInterval(poll);
      }
    }, 250);
    return () => window.clearInterval(poll);
  }, []);

  return voices;
}
