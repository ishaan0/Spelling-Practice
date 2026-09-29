import type { TestAnswer, QuestionStatus, TestSession } from './testTypes';
import { generateId } from '../../utils/ids';

export interface TestState {
  session: TestSession | null;
  currentWord: string | null;
  questionId: string | null;
  questionStatus: QuestionStatus;
  input: string;
  lastResult: TestAnswer | null;
  /** Deadline (performance.now ms) for the active timer, if any. */
  deadlineMs: number | null;
}

export const initialState: TestState = {
  session: null,
  currentWord: null,
  questionId: null,
  questionStatus: 'idle',
  input: '',
  lastResult: null,
  deadlineMs: null,
};

export type TestAction =
  | { type: 'START'; session: TestSession }
  | { type: 'SPEECH_STARTED'; deadlineMs: number | null }
  | { type: 'UPDATE_INPUT'; value: string }
  | { type: 'GRADE'; answer: TestAnswer }
  | { type: 'NEXT' }
  | { type: 'END_EARLY' }
  | { type: 'RESET' };

export function testReducer(state: TestState, action: TestAction): TestState {
  switch (action.type) {
    case 'START': {
      const s = action.session;
      const first = s.words[0] ?? null;
      return {
        session: s,
        currentWord: first,
        questionId: first ? generateId() : null,
        questionStatus: 'speaking',
        input: '',
        lastResult: null,
        deadlineMs: null,
      };
    }
    case 'SPEECH_STARTED': {
      if (state.questionStatus !== 'speaking') return state;
      return {
        ...state,
        questionStatus: 'answering',
        deadlineMs: action.deadlineMs,
      };
    }
    case 'UPDATE_INPUT': {
      if (state.questionStatus !== 'answering') return state;
      return { ...state, input: action.value };
    }
    case 'GRADE': {
      if (state.questionStatus !== 'answering' || !state.session) return state;
      return {
        ...state,
        questionStatus: 'feedback',
        lastResult: action.answer,
        deadlineMs: null,
        session: {
          ...state.session,
          answers: [...state.session.answers, action.answer],
        },
      };
    }
    case 'NEXT': {
      if (!state.session) return state;
      const nextIndex = state.session.currentIndex + 1;
      if (nextIndex >= state.session.words.length) {
        return {
          ...state,
          questionStatus: 'idle',
          session: {
            ...state.session,
            status: 'completed',
            currentIndex: nextIndex,
            endedAt: Date.now(),
          },
          currentWord: null,
          questionId: null,
          input: '',
          deadlineMs: null,
        };
      }
      const nextWord = state.session.words[nextIndex] ?? null;
      return {
        ...state,
        questionStatus: 'speaking',
        currentWord: nextWord,
        questionId: nextWord ? generateId() : null,
        input: '',
        lastResult: null,
        deadlineMs: null,
        session: {
          ...state.session,
          currentIndex: nextIndex,
        },
      };
    }
    case 'END_EARLY': {
      if (!state.session) return state;
      return {
        ...state,
        questionStatus: 'idle',
        session: {
          ...state.session,
          status: 'ended-early',
          endedAt: Date.now(),
        },
        currentWord: null,
        questionId: null,
        input: '',
        deadlineMs: null,
      };
    }
    case 'RESET': {
      return initialState;
    }
    default:
      return state;
  }
}