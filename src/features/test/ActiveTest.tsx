import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ArrowRight, CornerDownLeft, Volume2, X } from 'lucide-react';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { useApp } from '../../app/AppProvider';
import { useSpeechSynthesis } from '../speech/useSpeechSynthesis';
import { pickVoice } from '../speech/speechService';
import { TestProgress } from './TestProgress';
import { TestTimer } from './TestTimer';
import { AnswerInput } from './AnswerInput';
import { AnswerFeedback } from './AnswerFeedback';
import { createSession, gradeAnswer } from './testUtils';
import { initialState, testReducer } from './testReducer';
import type { AnswerReason, TestSession } from './testTypes';
import { FEEDBACK_DELAY_CORRECT_MS, SPEECH_START_FALLBACK_MS } from '../../utils/constants';
import { countLabel } from '../../utils/pluralize';

interface ActiveTestProps {
  initialWords: string[];
  /** Called once with the finished (or ended-early) session. */
  onComplete: (session: TestSession) => void;
  /** Called when the test is abandoned before anything was answered. */
  onExit: () => void;
}

type AudioIssue = 'not-started' | 'failed';

export function ActiveTest({ initialWords, onComplete, onExit }: ActiveTestProps) {
  const { settings } = useApp();
  // The settings a test starts with apply until it ends.
  const [testSettings] = useState(settings);
  const [state, dispatch] = useReducer(testReducer, undefined, () =>
    testReducer(initialState, {
      type: 'START',
      session: createSession({
        words: initialWords,
        questionCount: initialWords.length,
        timerEnabled: testSettings.timerEnabled,
        secondsPerWord: testSettings.secondsPerWord,
        language: testSettings.language,
        voiceName: testSettings.voiceName,
        speechRate: testSettings.speechRate,
        pitch: testSettings.pitch,
      }),
    }),
  );
  const { supported, voices, speaking, speak, cancel } = useSpeechSynthesis();

  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [audioIssue, setAudioIssue] = useState<AudioIssue | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Guards against callbacks that arrive for a question that is already over.
  const activeQuestionIdRef = useRef<string | null>(null);
  const timerArmedRef = useRef(false);
  const completedRef = useRef(false);

  const durationMs = testSettings.timerEnabled ? testSettings.secondsPerWord * 1000 : 0;

  const voice = useMemo(
    () => pickVoice(voices, testSettings.voiceName, testSettings.language),
    [voices, testSettings.voiceName, testSettings.language],
  );

  /** Opens the question for answering and starts its timer — once per question. */
  const armTimer = useCallback(
    (questionId: string) => {
      if (activeQuestionIdRef.current !== questionId || timerArmedRef.current) return;
      timerArmedRef.current = true;
      dispatch({
        type: 'SPEECH_STARTED',
        deadlineMs: durationMs > 0 ? performance.now() + durationMs : null,
      });
    },
    [durationMs],
  );

  const speakWord = useCallback(
    (word: string, questionId: string) => {
      speak(word, {
        voice,
        lang: testSettings.language,
        rate: testSettings.speechRate,
        pitch: testSettings.pitch,
        onStart: () => {
          if (activeQuestionIdRef.current !== questionId) return;
          setAudioIssue(null);
          armTimer(questionId);
        },
        onError: () => {
          if (activeQuestionIdRef.current !== questionId) return;
          setAudioIssue('failed');
          armTimer(questionId);
        },
      });
    },
    [speak, voice, testSettings.language, testSettings.speechRate, testSettings.pitch, armTimer],
  );

  // Read each new word out loud. If the browser never starts speaking, open
  // the question anyway so the test can't get stuck.
  const speakWordRef = useRef(speakWord);
  useEffect(() => {
    speakWordRef.current = speakWord;
  }, [speakWord]);

  useEffect(() => {
    const questionId = state.questionId;
    const word = state.currentWord;
    if (!questionId || word === null) return;

    activeQuestionIdRef.current = questionId;
    timerArmedRef.current = false;
    setAudioIssue(null);
    speakWordRef.current(word, questionId);

    const fallback = window.setTimeout(() => {
      if (activeQuestionIdRef.current !== questionId || timerArmedRef.current) return;
      setAudioIssue('not-started');
      armTimer(questionId);
    }, SPEECH_START_FALLBACK_MS);
    return () => window.clearTimeout(fallback);
  }, [state.questionId, state.currentWord, armTimer]);

  // Correct answers move on by themselves; mistakes wait so they can be studied.
  useEffect(() => {
    if (state.questionStatus !== 'feedback' || state.paused) return;
    if (state.lastResult?.status !== 'correct') return;
    const timer = window.setTimeout(() => dispatch({ type: 'NEXT' }), FEEDBACK_DELAY_CORRECT_MS);
    return () => window.clearTimeout(timer);
  }, [state.questionStatus, state.lastResult, state.paused]);

  // Clicking Check / Skip / Next moves focus to a button that then disappears.
  // Bring it back to the answer box so typing and Enter keep working.
  useEffect(() => {
    if (showEndConfirm) return;
    inputRef.current?.focus();
  }, [state.questionStatus, state.questionId, showEndConfirm]);

  // Hand the session over when the test is finished.
  const session = state.session;
  useEffect(() => {
    if (!session || session.status === 'active' || completedRef.current) return;
    completedRef.current = true;
    onComplete(session);
  }, [session, onComplete]);

  const grade = useCallback(
    (reason: AnswerReason) => {
      if (!state.session || state.currentWord === null) return;
      if (state.questionStatus !== 'speaking' && state.questionStatus !== 'answering') return;
      cancel();
      dispatch({
        type: 'GRADE',
        answer: gradeAnswer(state.currentWord, state.input, state.session.currentIndex, reason),
      });
    },
    [state.session, state.currentWord, state.input, state.questionStatus, cancel],
  );

  const handleTimeout = useCallback(() => grade('timeout'), [grade]);

  const handleReplay = useCallback(() => {
    if (state.currentWord === null || !state.questionId) return;
    speakWord(state.currentWord, state.questionId);
    inputRef.current?.focus();
  }, [state.currentWord, state.questionId, speakWord]);

  const isFeedback = state.questionStatus === 'feedback';

  const handleEnter = () => {
    if (isFeedback) dispatch({ type: 'NEXT' });
    else if (state.input.trim().length === 0) handleReplay();
    else grade('submitted');
  };

  const openEndConfirm = () => {
    dispatch({ type: 'PAUSE', nowMs: performance.now() });
    setShowEndConfirm(true);
  };

  const closeEndConfirm = () => {
    setShowEndConfirm(false);
    dispatch({ type: 'RESUME', nowMs: performance.now() });
  };

  const confirmEnd = () => {
    cancel();
    setShowEndConfirm(false);
    if (!state.session || state.session.answers.length === 0) {
      onExit();
      return;
    }
    dispatch({ type: 'END_EARLY' });
  };

  if (!state.session) return null;

  const totalQuestions = state.session.words.length;
  const answered = state.session.answers.length;
  const correctCount = state.session.answers.filter((a) => a.status === 'correct').length;
  const isLastQuestion = state.session.currentIndex >= totalQuestions - 1;
  const hasInput = state.input.trim().length > 0;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Spelling test</h1>
        <Button variant="secondary" size="sm" onClick={openEndConfirm}>
          <X size={15} aria-hidden="true" />
          End test
        </Button>
      </div>

      <TestProgress
        currentIndex={state.session.currentIndex}
        answered={answered}
        total={totalQuestions}
        correct={correctCount}
        incorrect={answered - correctCount}
      />

      <section
        aria-label="Current word"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-8"
      >
        {durationMs > 0 && (
          <div className={`mb-6 ${isFeedback ? 'invisible' : ''}`}>
            <TestTimer
              deadlineMs={state.deadlineMs}
              durationMs={durationMs}
              frozenRemainingMs={state.pausedRemainingMs}
              onExpire={handleTimeout}
            />
          </div>
        )}

        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleReplay}
              // Keep the caret in the answer field when the speaker is clicked.
              onMouseDown={(e) => e.preventDefault()}
              disabled={!supported}
              aria-label="Listen to the word again"
              className="group relative flex h-20 w-20 items-center justify-center rounded-full bg-accent-600 text-white shadow-md transition hover:bg-accent-700 active:scale-95 focus-ring disabled:bg-slate-300"
              data-testid="replay-btn"
            >
              {speaking && (
                <span
                  className="absolute inset-0 rounded-full bg-accent-400 animate-sound-ring"
                  aria-hidden="true"
                />
              )}
              <Volume2 size={34} className="relative" aria-hidden="true" />
            </button>
            <span className="text-sm font-medium text-slate-600">
              {speaking ? 'Listen…' : 'Listen again'}
            </span>
          </div>

          {/* The answer box and its buttons stay put; anything that comes and
              goes (feedback, audio notices) is shown underneath them. */}
          <div className="flex w-full flex-col gap-3">
            <AnswerInput
              value={state.input}
              onChange={(value) => dispatch({ type: 'UPDATE_INPUT', value })}
              onEnter={handleEnter}
              locked={isFeedback}
              result={isFeedback ? (state.lastResult?.status ?? null) : null}
              inputRef={inputRef}
            />

            <div className="flex w-full items-center justify-between gap-2">
              {isFeedback ? (
                <>
                  <span className="hidden text-xs text-slate-500 sm:block">
                    Press <Kbd>Enter</Kbd> to continue
                  </span>
                  <Button
                    size="lg"
                    onClick={() => dispatch({ type: 'NEXT' })}
                    className="flex-1 sm:min-w-[10rem] sm:flex-none"
                    data-testid="next-btn"
                  >
                    {isLastQuestion ? 'See results' : 'Next word'}
                    <ArrowRight size={18} aria-hidden="true" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={() => grade('skipped')}
                    className="px-4"
                    data-testid="skip-btn"
                  >
                    I don't know
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => grade('submitted')}
                    disabled={!hasInput}
                    className="flex-1 sm:min-w-[10rem] sm:flex-none"
                    data-testid="submit-btn"
                  >
                    Check
                    <CornerDownLeft size={18} aria-hidden="true" />
                  </Button>
                </>
              )}
            </div>
          </div>

          <AnswerFeedback answer={state.lastResult} questionStatus={state.questionStatus} />

          {(!supported || audioIssue) && (
            <div
              role="alert"
              className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              <span>
                {!supported
                  ? "This browser can't read words aloud. Try Chrome, Edge or Safari."
                  : audioIssue === 'failed'
                    ? "The word couldn't be played."
                    : "The audio didn't start. Check that your sound is on."}
              </span>
              {supported && (
                <Button variant="secondary" size="sm" onClick={handleReplay}>
                  Play again
                </Button>
              )}
            </div>
          )}
        </div>
      </section>

      {!isFeedback && (
        <p className="hidden text-center text-xs text-slate-500 sm:block">
          <Kbd>Enter</Kbd> checks your answer · <Kbd>Enter</Kbd> on an empty box plays the word again
        </p>
      )}

      <Dialog
        open={showEndConfirm}
        title="End this test?"
        description={
          answered === 0
            ? "You haven't answered any words yet, so there won't be any results."
            : `You've answered ${answered} of ${countLabel(totalQuestions, 'word')}. The words you haven't reached won't count against you.`
        }
        confirmLabel="End test"
        confirmVariant="danger"
        cancelLabel="Keep practicing"
        onConfirm={confirmEnd}
        onCancel={closeEndConfirm}
      />
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-sans text-[11px] font-medium text-slate-600 shadow-sm">
      {children}
    </kbd>
  );
}
