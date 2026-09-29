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

  it('UPDATE_INPUT only changes input while answering', () => {
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
    state = testReducer(state, { type: 'UPDATE_INPUT', value: 'hello' });
    expect(state.input).toBe(''); // still in 'speaking'
    state = testReducer(state, { type: 'SPEECH_STARTED', deadlineMs: null });
    state = testReducer(state, { type: 'UPDATE_INPUT', value: 'hello' });
    expect(state.input).toBe('hello');
  });

  it('GRADE only applies when answering (race condition guard)', () => {
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
    // No SPEECH_STARTED yet — still 'speaking'
    state = testReducer(state, { type: 'GRADE', answer: makeAnswer() });
    expect(state.questionStatus).toBe('speaking');
    expect(state.session?.answers).toHaveLength(0);
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