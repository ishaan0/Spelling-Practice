import { normalizeAnswer } from '../../utils/normalizeAnswer';
import { generateId } from '../../utils/ids';
import type { TestAnswer, TestSession } from './testTypes';

export function gradeAnswer(
  word: string,
  userAnswer: string,
  questionIndex: number,
  reason: 'submitted' | 'timeout',
): TestAnswer {
  const submitted = normalizeAnswer(userAnswer);
  const expected = normalizeAnswer(word);
  return {
    id: generateId(),
    word,
    userAnswer: userAnswer.trim(),
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