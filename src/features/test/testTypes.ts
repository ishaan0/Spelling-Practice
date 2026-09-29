export type AnswerStatus = 'correct' | 'incorrect';

export type AnswerReason = 'submitted' | 'timeout';

export type QuestionStatus =
  | 'idle'
  | 'speaking'
  | 'answering'
  | 'grading'
  | 'feedback';

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
