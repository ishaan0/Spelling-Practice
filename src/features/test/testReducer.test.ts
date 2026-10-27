import { describe, expect, it } from 'vitest';
import { initialState, testReducer } from './testReducer';
import { createSession } from './testUtils';
import type { TestAnswer } from './testTypes';

function makeAnswer(overrides: Partial<TestAnswer> = {}): TestAnswer {
  return {
    id: 'a1',
    word: 'apple',
    userAnswer: 'apple',
    status: 'correct',
    reason: 'submitted',
    questionIndex: 0,
    answeredAt: Date.now(),
    ...overrides,
  };
}

function makeSession(words: string[]) {
  return createSession({
    words,
    questionCount: 'all',
    timerEnabled: true,
    secondsPerWord: 10,
    language: 'en-US',
    voiceName: null,
    speechRate: 1,
    pitch: 1,
  });
}

describe('testReducer', () => {
  it('START initializes the first question in speaking state', () => {
    const session = createSession({
      words: ['apple', 'banana'],
      questionCount: 'all',
      timerEnabled: true,
      secondsPerWord: 10,
      language: 'en-US',
      voiceName: null,
      speechRate: 1,
      pitch: 1,
    });
    const next = testReducer(initialState, { type: 'START', session });
    expect(next.currentWord).toBe('apple');
    expect(next.questionStatus).toBe('speaking');
    expect(next.input).toBe('');
    expect(next.deadlineMs).toBeNull();
  });

  it('SPEECH_STARTED transitions speaking -> answering and stores deadline', () => {
    const session = createSession({
      words: ['apple'],
      questionCount: 'all',
      timerEnabled: true,
      secondsPerWord: 10,
      language: 'en-US',
      voiceName: null,
      speechRate: 1,
      pitch: 1,
    });
    let state = testReducer(initialState, { type: 'START', session });
    state = testReducer(state, { type: 'SPEECH_STARTED', deadlineMs: 1000 });
    expect(state.questionStatus).toBe('answering');
    expect(state.deadlineMs).toBe(1000);
  });

  it('UPDATE_INPUT is accepted while the word is still being spoken', () => {
    const session = makeSession(['apple']);
    let state = testReducer(initialState, { type: 'START', session });
    state = testReducer(state, { type: 'UPDATE_INPUT', value: 'he' });
    expect(state.input).toBe('he');
    state = testReducer(state, { type: 'SPEECH_STARTED', deadlineMs: null });
    state = testReducer(state, { type: 'UPDATE_INPUT', value: 'hello' });
    expect(state.input).toBe('hello');
  });

  it('UPDATE_INPUT is ignored while feedback is shown', () => {
    const session = makeSession(['apple', 'banana']);
    let state = testReducer(initialState, { type: 'START', session });
    state = testReducer(state, { type: 'GRADE', answer: makeAnswer() });
    state = testReducer(state, { type: 'UPDATE_INPUT', value: 'late' });
    expect(state.input).toBe('');
  });

  it('GRADE is applied once per question (race condition guard)', () => {
    const session = makeSession(['apple', 'banana']);
    let state = testReducer(initialState, { type: 'START', session });
    state = testReducer(state, { type: 'SPEECH_STARTED', deadlineMs: 1000 });
    state = testReducer(state, { type: 'GRADE', answer: makeAnswer() });
    // A timeout firing right after the submit must not add a second answer.
    state = testReducer(state, { type: 'GRADE', answer: makeAnswer({ reason: 'timeout' }) });
    expect(state.questionStatus).toBe('feedback');
    expect(state.session?.answers).toHaveLength(1);

    // Nor may a stale answer for the previous question land on the next one.
    state = testReducer(state, { type: 'NEXT' });
    state = testReducer(state, { type: 'GRADE', answer: makeAnswer({ questionIndex: 0 }) });
    expect(state.questionStatus).toBe('speaking');
    expect(state.session?.answers).toHaveLength(1);
  });

  it('NEXT is ignored unless feedback is showing', () => {
    const session = makeSession(['apple', 'banana']);
    let state = testReducer(initialState, { type: 'START', session });
    state = testReducer(state, { type: 'NEXT' });
    expect(state.currentWord).toBe('apple');
    expect(state.session?.currentIndex).toBe(0);
  });

  it('PAUSE freezes the timer and RESUME restores the remaining time', () => {
    const session = makeSession(['apple']);
    let state = testReducer(initialState, { type: 'START', session });
    state = testReducer(state, { type: 'SPEECH_STARTED', deadlineMs: 10_000 });
    state = testReducer(state, { type: 'PAUSE', nowMs: 4_000 });
    expect(state.paused).toBe(true);
    expect(state.deadlineMs).toBeNull();
    expect(state.pausedRemainingMs).toBe(6_000);
    state = testReducer(state, { type: 'RESUME', nowMs: 50_000 });
    expect(state.paused).toBe(false);
    expect(state.deadlineMs).toBe(56_000);
  });

  it('NEXT advances to the next word in speaking state', () => {
    const session = createSession({
      words: ['apple', 'banana'],
      questionCount: 'all',
      timerEnabled: true,
      secondsPerWord: 10,
      language: 'en-US',
      voiceName: null,
      speechRate: 1,
      pitch: 1,
    });
    let state = testReducer(initialState, { type: 'START', session });
    state = testReducer(state, { type: 'SPEECH_STARTED', deadlineMs: 1000 });
    state = testReducer(state, { type: 'GRADE', answer: makeAnswer() });
    state = testReducer(state, { type: 'NEXT' });
    expect(state.currentWord).toBe('banana');
    expect(state.questionStatus).toBe('speaking');
    expect(state.input).toBe('');
  });

  it('NEXT at end transitions session to completed', () => {
    const session = createSession({
      words: ['apple'],
      questionCount: 'all',
      timerEnabled: false,
      secondsPerWord: 0,
      language: 'en-US',
      voiceName: null,
      speechRate: 1,
      pitch: 1,
    });
    let state = testReducer(initialState, { type: 'START', session });
    state = testReducer(state, { type: 'SPEECH_STARTED', deadlineMs: null });
    state = testReducer(state, { type: 'GRADE', answer: makeAnswer() });
    state = testReducer(state, { type: 'NEXT' });
    expect(state.session?.status).toBe('completed');
    expect(state.questionStatus).toBe('idle');
  });

  it('END_EARLY marks session as ended-early with no answers added', () => {
    const session = createSession({
      words: ['apple', 'banana'],
      questionCount: 'all',
      timerEnabled: false,
      secondsPerWord: 0,
      language: 'en-US',
      voiceName: null,
      speechRate: 1,
      pitch: 1,
    });
    let state = testReducer(initialState, { type: 'START', session });
    state = testReducer(state, { type: 'END_EARLY' });
    expect(state.session?.status).toBe('ended-early');
    expect(state.questionStatus).toBe('idle');
    expect(state.session?.answers).toHaveLength(0);
  });
});
describe('testReducer breaks', () => {
  function sessionWithBreaks(words: string[], breakEvery: number | null) {
    return createSession({
      words,
      questionCount: 'all',
      timerEnabled: false,
      secondsPerWord: 10,
      language: 'en-US',
      voiceName: null,
      speechRate: 1,
      pitch: 1,
      breakEvery,
    });
  }

  function answerCurrent(state: ReturnType<typeof testReducer>) {
    const index = state.session!.currentIndex;
    const graded = testReducer(state, {
      type: 'GRADE',
      answer: makeAnswer({ id: `a${index}`, word: state.currentWord!, questionIndex: index }),
    });
    return testReducer(graded, { type: 'NEXT' });
  }

  it('stops for a break after every n words and continues with the next word', () => {
    let state = testReducer(initialState, {
      type: 'START',
      session: sessionWithBreaks(['a', 'b', 'c', 'd', 'e'], 2),
    });

    state = answerCurrent(state);
    expect(state.questionStatus).toBe('speaking');
    state = answerCurrent(state);
    expect(state.questionStatus).toBe('break');
    expect(state.currentWord).toBeNull();
    expect(state.session!.currentIndex).toBe(2);

    // Answers can't be given during a break.
    expect(testReducer(state, { type: 'UPDATE_INPUT', value: 'x' })).toBe(state);

    state = testReducer(state, { type: 'CONTINUE' });
    expect(state.questionStatus).toBe('speaking');
    expect(state.currentWord).toBe('c');
    expect(state.questionId).not.toBeNull();
  });

  it('never stops for a break after the last word', () => {
    let state = testReducer(initialState, {
      type: 'START',
      session: sessionWithBreaks(['a', 'b'], 2),
    });
    state = answerCurrent(answerCurrent(state));
    expect(state.session!.status).toBe('completed');
  });

  it('can finish the test at a break, keeping the answers so far', () => {
    let state = testReducer(initialState, {
      type: 'START',
      session: sessionWithBreaks(['a', 'b', 'c'], 1),
    });
    state = answerCurrent(state);
    expect(state.questionStatus).toBe('break');

    state = testReducer(state, { type: 'END_EARLY' });
    expect(state.session!.status).toBe('ended-early');
    expect(state.session!.answers).toHaveLength(1);
  });

  it('ignores CONTINUE outside a break', () => {
    const state = testReducer(initialState, {
      type: 'START',
      session: sessionWithBreaks(['a', 'b'], 1),
    });
    expect(testReducer(state, { type: 'CONTINUE' })).toBe(state);
  });
});
