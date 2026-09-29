import { useEffect, useState } from 'react';

export function useVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const synth = window.speechSynthesis;

    const update = () => {
      const list = synth.getVoices();
      setVoices(list);
    };

    update();
    synth.addEventListener('voiceschanged', update);

    return () => {
      synth.removeEventListener('voiceschanged', update);
    };
  }, []);

  return voices;
}
