export interface SpeakOptions {
  voice?: SpeechSynthesisVoice | null;
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  /** Real playback failures only — being cancelled or replaced is not an error. */
  onError?: (error: unknown) => void;
}

export interface SpeechController {
  supported: boolean;
  speaking: boolean;
  speak: (text: string, options?: SpeakOptions) => void;
  cancel: () => void;
}
