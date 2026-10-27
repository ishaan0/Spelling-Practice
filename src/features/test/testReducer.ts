import type { TestAnswer, QuestionStatus, TestSession } from './testTypes';
import { generateId } from '../../utils/ids';
import { isBreakAfter } from './testUtils';

export interface TestState {
  session: TestSession | null;
  currentWord: string | null;
  questionId: string | null;
  questionStatus: QuestionStatus;
  input: string;
  lastResult: TestAnswer | null;
  /** Deadline (performance.now ms) for the active timer, if any. */
  deadlineMs: number | null;
  /** While paused: how much time was left on the timer (null = no timer running). */
  paused: boolean;
  pausedRemainingMs: number | null;
}

export const initialState: TestState = {
  session: null,
  currentWord: null,
  questionId: null,
  questionStatus: 'idle',
  input: '',
  lastResult: null,
  deadlineMs: null,
  paused: false,
  pausedRemainingMs: null,
};

export type TestAction =
  | { type: 'START'; session: TestSession }
  | { type: 'SPEECH_STARTED'; deadlineMs: number | null }
  | { type: 'UPDATE_INPUT'; value: string }
  | { type: 'GRADE'; answer: TestAnswer }
  | { type: 'NEXT' }
  /** Ends a break and reads out the next word. */
  | { type: 'CONTINUE' }
  | { type: 'PAUSE'; nowMs: number }
  | { type: 'RESUME'; nowMs: number }
  | { type: 'END_EARLY' }
  | { type: 'RESET' };

function isOpenForAnswer(status: QuestionStatus): boolean {
  return status === 'speaking' || status === 'answering';
}

export function testReducer(state: TestState, action: TestAction): TestState {
  switch (action.type) {
    case 'START': {
      const s = action.session;
      const first = s.words[0] ?? null;
      return {
        ...initialState,
        session: s,
        currentWord: first,
        questionId: first ? generateId() : null,
        questionStatus: 'speaking',
      };
    }
    case 'SPEECH_STARTED': {
      if (state.questionStatus !== 'speaking') return state;
      if (state.paused) {
        // The timer starts counting once the test is resumed.
        return {
          ...state,
          questionStatus: 'answering',
          pausedRemainingMs:
            action.deadlineMs === null ? null : Math.max(0, action.deadlineMs - performance.now()),
        };
      }
      return {
        ...state,
        questionStatus: 'answering',
        deadlineMs: action.deadlineMs,
      };
    }
    case 'UPDATE_INPUT': {
      // Typing is allowed as soon as the question is shown, even mid-speech.
      if (!isOpenForAnswer(state.questionStatus)) return state;
      return { ...state, input: action.value };
    }
    case 'GRADE': {
      if (!isOpenForAnswer(state.questionStatus) || !state.session) return state;
      // Guard against double submits (Enter + timeout in the same frame).
      if (action.answer.questionIndex !== state.session.currentIndex) return state;
      return {
        ...state,
        questionStatus: 'feedback',
        lastResult: action.answer,
        deadlineMs: null,
        pausedRemainingMs: null,
        session: {
          ...state.session,
          answers: [...state.session.answers, action.answer],
        },
      };
    }
    case 'NEXT': {
      if (!state.session || state.questionStatus !== 'feedback') return state;
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
          pausedRemainingMs: null,
        };
      }
      const { breakEvery } = state.session.settings;
      if (isBreakAfter(state.session.currentIndex, breakEvery, state.session.words.length)) {
        return {
          ...state,
          questionStatus: 'break',
          currentWord: null,
          questionId: null,
          input: '',
          lastResult: null,
          deadlineMs: null,
          pausedRemainingMs: null,
          session: {
            ...state.session,
            currentIndex: nextIndex,
          },
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
        pausedRemainingMs: null,
        session: {
          ...state.session,
          currentIndex: nextIndex,
        },
      };
    }
    case 'CONTINUE': {
      if (!state.session || state.questionStatus !== 'break') return state;
      const word = state.session.words[state.session.currentIndex] ?? null;
      if (word === null) return state;
      return {
        ...state,
        questionStatus: 'speaking',
        currentWord: word,
        questionId: generateId(),
      };
    }
    case 'PAUSE': {
      if (state.paused) return state;
      return {
        ...state,
        paused: true,
        deadlineMs: null,
        pausedRemainingMs:
          state.deadlineMs === null ? null : Math.max(0, state.deadlineMs - action.nowMs),
      };
    }
    case 'RESUME': {
      if (!state.paused) return state;
      return {
        ...state,
        paused: false,
        deadlineMs:
          state.pausedRemainingMs === null ? null : action.nowMs + state.pausedRemainingMs,
        pausedRemainingMs: null,
      };
    }
    case 'END_EARLY': {
      if (!state.session) return state;
      return {
        ...state,
        questionStatus: 'idle',
        paused: false,
        session: {
          ...state.session,
          status: 'ended-early',
          endedAt: Date.now(),
        },
        currentWord: null,
        questionId: null,
        input: '',
        deadlineMs: null,
        pausedRemainingMs: null,
      };
    }
    case 'RESET': {
      return initialState;
    }
    default:
      return state;
  }
}
