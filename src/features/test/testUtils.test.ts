import { describe, expect, it } from 'vitest';
import {
  computeScore,
  createSession,
  formatDuration,
  gradeAnswer,
  uniqueMistakeWords,
  isBreakAfter,
  countBreaks,
} from './testUtils';

describe('gradeAnswer', () => {
  it('marks correct when normalized answers match (case-insensitive)', () => {
    const a = gradeAnswer('Apple', 'apple', 0, 'submitted');
    expect(a.status).toBe('correct');
  });

  it('marks incorrect when normalized answers differ', () => {
    const a = gradeAnswer('necessary', 'neccessary', 0, 'submitted');
    expect(a.status).toBe('incorrect');
  });

  it('preserves apostrophes in the comparison', () => {
    const a = gradeAnswer("can't", 'cant', 0, 'submitted');
    expect(a.status).toBe('incorrect');
  });

  it('records reason as timeout when applicable', () => {
    const a = gradeAnswer('foo', '', 0, 'timeout');
    expect(a.reason).toBe('timeout');
    expect(a.status).toBe('incorrect');
  });
});

describe('createSession', () => {
  it('builds a session with the supplied words', () => {
    const s = createSession({
      words: ['a', 'b'],
      questionCount: 'all',
      timerEnabled: true,
      secondsPerWord: 10,
      language: 'en-US',
      voiceName: null,
      speechRate: 1,
      pitch: 1,
    });
    expect(s.words).toEqual(['a', 'b']);
    expect(s.currentIndex).toBe(0);
    expect(s.answers).toEqual([]);
    expect(s.status).toBe('active');
  });
});

describe('computeScore', () => {
  it('returns 0/0/0% for empty answers', () => {
    const s = createSession({
      words: ['a', 'b'],
      questionCount: 'all',
      timerEnabled: false,
      secondsPerWord: 0,
      language: 'en-US',
      voiceName: null,
      speechRate: 1,
      pitch: 1,
    });
    const summary = computeScore(s);
    expect(summary.totalAnswered).toBe(0);
    expect(summary.correct).toBe(0);
    expect(summary.incorrect).toBe(0);
    expect(summary.accuracy).toBe(0);
  });

  it('computes correct accuracy', () => {
    const s = createSession({
      words: ['a', 'b', 'c', 'd'],
      questionCount: 'all',
      timerEnabled: false,
      secondsPerWord: 0,
      language: 'en-US',
      voiceName: null,
      speechRate: 1,
      pitch: 1,
    });
    s.answers = [
      gradeAnswer('a', 'a', 0, 'submitted'),
      gradeAnswer('b', 'b', 1, 'submitted'),
      gradeAnswer('c', 'wrong', 2, 'submitted'),
      gradeAnswer('d', 'd', 3, 'submitted'),
    ];
    const summary = computeScore(s);
    expect(summary.totalAnswered).toBe(4);
    expect(summary.correct).toBe(3);
    expect(summary.incorrect).toBe(1);
    expect(summary.accuracy).toBe(75);
  });

  it('rounds percentages', () => {
    const s = createSession({
      words: ['a', 'b', 'c'],
      questionCount: 'all',
      timerEnabled: false,
      secondsPerWord: 0,
      language: 'en-US',
      voiceName: null,
      speechRate: 1,
      pitch: 1,
    });
    s.answers = [
      gradeAnswer('a', 'a', 0, 'submitted'),
      gradeAnswer('b', 'wrong', 1, 'submitted'),
      gradeAnswer('c', 'c', 2, 'submitted'),
    ];
    const summary = computeScore(s);
    expect(summary.accuracy).toBe(67); // 2/3 = 66.67 → 67
  });
});

describe('uniqueMistakeWords', () => {
  it('returns only incorrect, deduplicated words', () => {
    const s = createSession({
      words: ['apple', 'banana', 'cherry'],
      questionCount: 'all',
      timerEnabled: false,
      secondsPerWord: 0,
      language: 'en-US',
      voiceName: null,
      speechRate: 1,
      pitch: 1,
    });
    s.answers = [
      gradeAnswer('apple', 'wrong', 0, 'submitted'),
      gradeAnswer('banana', 'banana', 1, 'submitted'),
      gradeAnswer('cherry', 'wrong', 2, 'submitted'),
    ];
    expect(uniqueMistakeWords(s)).toEqual(['apple', 'cherry']);
  });
});
describe('gradeAnswer when skipping', () => {
  it('never counts a skipped word as correct', () => {
    const a = gradeAnswer('apple', 'apple', 0, 'skipped');
    expect(a.status).toBe('incorrect');
    expect(a.userAnswer).toBe('');
  });
});

describe('breaks', () => {
  it('is due after every n-th word, but never after the last one', () => {
    const due = Array.from({ length: 10 }, (_, i) => isBreakAfter(i, 3, 10));
    // Answered 3, 6 and 9 words; the 10th is the end of the test.
    expect(due.map((d, i) => (d ? i + 1 : null)).filter(Boolean)).toEqual([3, 6, 9]);
    expect(isBreakAfter(8, 3, 9)).toBe(false);
  });

  it('never happens without a break setting', () => {
    expect(isBreakAfter(29, null, 100)).toBe(false);
    expect(isBreakAfter(0, 0, 100)).toBe(false);
  });

  it('counts the breaks in a test', () => {
    expect(countBreaks(100, 30)).toBe(3);
    expect(countBreaks(90, 30)).toBe(2);
    expect(countBreaks(30, 30)).toBe(0);
    expect(countBreaks(20, 30)).toBe(0);
    expect(countBreaks(100, null)).toBe(0);
  });
});

describe('formatDuration', () => {
  it('formats seconds and minutes', () => {
    expect(formatDuration(42_000)).toBe('42s');
    expect(formatDuration(95_000)).toBe('1m 35s');
    expect(formatDuration(-5)).toBe('0s');
  });
});
