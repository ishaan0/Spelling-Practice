import { vi } from 'vitest';

/**
 * Mock window.speechSynthesis and SpeechSynthesisUtterance for tests.
 *
 * The mocked utterance invokes registered onstart/onend/onerror callbacks
 * synchronously via helpers, allowing tests to deterministically simulate
 * speech lifecycle.
 */

type Callback = (() => void) | undefined;

export interface FakeUtterance {
  text: string;
  voice: SpeechSynthesisVoice | null;
  lang: string;
  rate: number;
  pitch: number;
  volume: number;
  onstart: Callback;
  onend: Callback;
  onerror: Callback;
}

let voices: SpeechSynthesisVoice[] = [];
const queue: FakeUtterance[] = [];
let speakingNow = false;

export function __installSpeechSynthesisMock() {
  if (typeof window === 'undefined') return;
  queue.length = 0;
  speakingNow = false;

  const fakeClass = class {
    text: string;
    constructor(text = '') {
      this.text = text;
    }
    voice: SpeechSynthesisVoice | null = null;
    lang = '';
    rate = 1;
    pitch = 1;
    volume = 1;
    onstart: Callback = undefined;
    onend: Callback = undefined;
    onerror: Callback = undefined;
  } as unknown as typeof SpeechSynthesisUtterance;

  // Replace global constructor
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).SpeechSynthesisUtterance = fakeClass;

  const synth = {
    getVoices: vi.fn(() => voices),
    cancel: vi.fn(() => {
      while (queue.length > 0) queue.pop();
      if (speakingNow) {
        speakingNow = false;
      }
    }),
    speak: vi.fn((u: FakeUtterance) => {
      queue.push(u);
      // Simulate browser firing onstart + onend asynchronously
      // but tests can also call __flushSpeech() to run them sync.
    }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    onvoiceschanged: null as null | (() => void),
    speaking: false,
    paused: false,
    pending: false,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).speechSynthesis = synth;
}

export function __setVoices(list: SpeechSynthesisVoice[]) {
  voices = list;
  if (typeof window !== 'undefined') {
    const synth = (window as { speechSynthesis?: { onvoiceschanged: (() => void) | null } }).speechSynthesis;
    synth?.onvoiceschanged?.();
  }
}

export function __getPendingUtterances(): FakeUtterance[] {
  return queue.slice();
}

/**
 * Synchronously fire onstart, then onend, on the most recent utterance.
 * Returns the utterance that was processed (or null).
 */
export function __flushSpeech(): FakeUtterance | null {
  const u = queue.shift();
  if (!u) return null;
  speakingNow = true;
  try {
    u.onstart?.();
    u.onend?.();
  } finally {
    speakingNow = false;
  }
  return u;
}

/**
 * Fire only onstart (useful for partial tests).
 */
export function __fireStart(): FakeUtterance | null {
  const u = queue.shift();
  if (!u) return null;
  speakingNow = true;
  u.onstart?.();
  return u;
}

/**
 * Fire only onend on the in-flight utterance (it was started earlier).
 */
export function __fireEnd() {
  speakingNow = false;
}
