import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { __installSpeechSynthesisMock, __setVoices } from './mocks/speechSynthesis';
import { resetSpeechState } from '../features/speech/speechService';

beforeEach(() => {
  resetSpeechState();
  __installSpeechSynthesisMock();
  __setVoices([
    { name: 'Alex', lang: 'en-US', localService: true, default: true, voiceURI: 'Alex' },
    { name: 'Daniel', lang: 'en-GB', localService: true, default: false, voiceURI: 'Daniel' },
  ] as unknown as SpeechSynthesisVoice[]);
});

afterEach(() => {
  cleanup();
  // Wipe localStorage between tests
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
  }
});
