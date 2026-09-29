import { normalizeAnswer } from '../../utils/normalizeAnswer';
import { generateId } from '../../utils/ids';
import { dedupeWords } from '../words/parseWords';
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
 * The running list of words to review: anything missed in this test is added,
 * anything spelled correctly is cleared. Words no longer in the library are dropped.
 */
export function updateMissedWords(
  previous: readonly string[],
  session: TestSession,
  library: readonly string[],
): string[] {
  const missedNow = new Set<string>();
  const correctNow = new Set<string>();
  for (const a of session.answers) {
    const key = a.word.toLowerCase();
    if (a.status === 'incorrect') missedNow.add(key);
    else correctNow.add(key);
  }
  const inLibrary = new Set(library.map((w) => w.toLowerCase()));
  const candidates = dedupeWords([...previous, ...uniqueMistakeWords(session)]);
  return candidates.filter((w) => {
    const key = w.toLowerCase();
    if (!inLibrary.has(key)) return false;
    return missedNow.has(key) || !correctNow.has(key);
  });
}

/** `95` → `1m 35s`, `42` → `42s`. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}
