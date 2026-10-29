import { normalizeAnswer } from '../../utils/normalizeAnswer';
import { generateId } from '../../utils/ids';
import type { AnswerReason, TestAnswer, TestSession } from './testTypes';

export function gradeAnswer(
  word: string,
  userAnswer: string,
  questionIndex: number,
  reason: AnswerReason,
): TestAnswer {
  // A skipped word never counts, whatever was in the box at the time.
  const typed = reason === 'skipped' ? '' : userAnswer;
  const submitted = normalizeAnswer(typed);
  const expected = normalizeAnswer(word);
  return {
    id: generateId(),
    word,
    userAnswer: typed.trim(),
    status: submitted === expected ? 'correct' : 'incorrect',
    reason,
    questionIndex,
    answeredAt: Date.now(),
  };
}

export function createSession(params: {
  words: string[];
  questionCount: number | 'all';
  timerEnabled: boolean;
  secondsPerWord: number;
  language: string;
  voiceName: string | null;
  speechRate: number;
  pitch: number;
  breakEvery?: number | null;
}): TestSession {
  return {
    id: generateId(),
    words: params.words,
    currentIndex: 0,
    answers: [],
    settings: {
      questionCount: params.questionCount,
      timerEnabled: params.timerEnabled,
      secondsPerWord: params.secondsPerWord,
      language: params.language,
      voiceName: params.voiceName,
      speechRate: params.speechRate,
      pitch: params.pitch,
      breakEvery: params.breakEvery ?? null,
    },
    startedAt: Date.now(),
    status: 'active',
  };
}

export interface ScoreSummary {
  totalAnswered: number;
  correct: number;
  incorrect: number;
  accuracy: number; // 0-100, integer
}

export function computeScore(session: TestSession): ScoreSummary {
  const totalAnswered = session.answers.length;
  const correct = session.answers.filter((a) => a.status === 'correct').length;
  const incorrect = totalAnswered - correct;
  const accuracy = totalAnswered === 0 ? 0 : Math.round((correct / totalAnswered) * 100);
  return { totalAnswered, correct, incorrect, accuracy };
}

export function uniqueMistakeWords(session: TestSession): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const a of session.answers) {
    if (a.status === 'incorrect') {
      const k = a.word.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        out.push(a.word);
      }
    }
  }
  return out;
}

/**
 * True when a break is due once the word at `index` (zero-based) has been
 * answered. There is never a break after the last word.
 */
export function isBreakAfter(index: number, breakEvery: number | null, total: number): boolean {
  if (breakEvery === null || breakEvery < 1) return false;
  const answered = index + 1;
  return answered < total && answered % breakEvery === 0;
}

/** How many breaks a test of `total` words will offer. */
export function countBreaks(total: number, breakEvery: number | null): number {
  if (breakEvery === null || breakEvery < 1 || total <= breakEvery) return 0;
  return Math.ceil(total / breakEvery) - 1;
}

/** `95` → `1m 35s`, `42` → `42s`. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}
