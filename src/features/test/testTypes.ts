export type AnswerStatus = 'correct' | 'incorrect';

export type AnswerReason = 'submitted' | 'timeout' | 'skipped';

export type QuestionStatus =
  | 'idle'
  /** The word is being read out; the timer has not started yet. */
  | 'speaking'
  | 'answering'
  | 'feedback'
  /** Between two words: the user chooses to carry on or to finish. */
  | 'break';

export type TestStatus = 'active' | 'completed' | 'ended-early';

export interface TestAnswer {
  id: string;
  word: string;
  userAnswer: string;
  status: AnswerStatus;
  reason: AnswerReason;
  questionIndex: number;
  answeredAt: number;
}

export interface TestSettings {
  questionCount: number | 'all';
  timerEnabled: boolean;
  secondsPerWord: number;
  language: string;
  voiceName: string | null;
  speechRate: number;
  pitch: number;
  /** A break is offered after every this many words; null for no breaks. */
  breakEvery: number | null;
}

export interface TestSession {
  id: string;
  words: string[];
  currentIndex: number;
  answers: TestAnswer[];
  settings: TestSettings;
  startedAt: number;
  endedAt?: number;
  status: TestStatus;
}
