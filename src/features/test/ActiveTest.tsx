import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Volume2, X } from 'lucide-react';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { useApp } from '../../app/AppProvider';
import { useSpeechSynthesis } from '../speech/useSpeechSynthesis';
import { useVoices } from '../../hooks/useVoices';
import { TestProgress } from './TestProgress';
import { TestTimer } from './TestTimer';
import { AnswerInput } from './AnswerInput';
import { AnswerFeedback } from './AnswerFeedback';
import { computeScore, createSession, gradeAnswer, uniqueMistakeWords } from './testUtils';
import { initialState, testReducer } from './testReducer';
import {
  FEEDBACK_DELAY_CORRECT_MS,
  FEEDBACK_DELAY_INCORRECT_MS,
} from '../../utils/constants';

interface ActiveTestProps {
  initialWords: string[];
  onComplete: (summary: {
    session: ReturnType<typeof computeScore>;
    words: string[];
    answers: import('./testTypes').TestAnswer[];
    status: 'completed' | 'ended-early';
    mistakeWords: string[];
  }) => void;
  onExit: () => void;
}

export function ActiveTest({ initialWords, onComplete, onExit }: ActiveTestProps) {
  const { settings, setLastResult, setMistakeWords } = useApp();
  const [state, dispatch] = useReducer(testReducer, initialState);
  const speech = useSpeechSynthesis();
  const voices = useVoices();

  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Refs for race-condition guards
  const activeQuestionIdRef = useRef<string | null>(null);
  const hasTimerStartedRef = useRef(false);
  const autoAdvanceTimer = useRef<number | null>(null);

  // Resolve voice
  const resolvedVoice = useMemo(() => {
    if (!settings.voiceName) return null;
    const exact = voices.find((v) => v.name === settings.voiceName);
    if (exact) return exact;
    return voices.find((v) => v.lang === settings.language) ?? null;
  }, [voices, settings.voiceName, settings.language]);

  // Initialize the test once on mount.
  useEffect(() => {
    if (!speech.supported) {
      // Render an explicit message but still build a session so user can read instructions.
      // We let them continue without audio — but the spec says do not silently run audio test
      // without audio. We surface a banner instead.
    }
    const session = createSession({
      words: initialWords,
      questionCount: initialWords.length,
      timerEnabled: settings.timerEnabled,
      secondsPerWord: settings.secondsPerWord,
      language: settings.language,
      voiceName: settings.voiceName,
      speechRate: settings.speechRate,
      pitch: settings.pitch,
    });
    dispatch({ type: 'START', session });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cancel speech + clear timers on unmount
  useEffect(() => {
    return () => {
      speech.cancel();
      if (autoAdvanceTimer.current !== null) {
        window.clearTimeout(autoAdvanceTimer.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Speak the current word when the question enters 'speaking' state.
  useEffect(() => {
    if (state.questionStatus !== 'speaking' || !state.currentWord) return;

    activeQuestionIdRef.current = state.questionId;
    hasTimerStartedRef.current = false;
    setSpeechError(null);

    if (!speech.supported) {
      // No speech support — show banner, but allow them to submit.
      // We don't auto-advance the timer; user must submit manually.
      // Bypass speaking state to allow answering immediately.
      // Dispatch SPEECH_STARTED with null deadline to allow manual input.
      // But our reducer transitions speaking -> answering only via SPEECH_STARTED.
      // Simulate "started" without a deadline.
      // (Visually this means the timer never appears.)
      // No-op here: user clicks Submit; if timer is disabled, deadlineMs is null.
      // Use an immediate manual-start path:
      dispatch({
        type: 'SPEECH_STARTED',
        deadlineMs: settings.timerEnabled
          ? performance.now() + settings.secondsPerWord * 1000
          : null,
      });
      return;
    }

    speech.speak(state.currentWord, {
      voice: resolvedVoice,
      lang: settings.language,
      rate: settings.speechRate,
      pitch: settings.pitch,
      onStart: () => {
        // Only arm the timer once per question (replay should not reset it).
        if (activeQuestionIdRef.current !== state.questionId) return;
        if (hasTimerStartedRef.current) return;
        hasTimerStartedRef.current = true;
        const deadline = settings.timerEnabled
          ? performance.now() + settings.secondsPerWord * 1000
          : null;
        dispatch({ type: 'SPEECH_STARTED', deadlineMs: deadline });
      },
      onEnd: () => {
        // No-op: the question remains in 'answering' until submit/timeout.
      },
      onError: (err) => {
        // Only report errors for the active question
        if (activeQuestionIdRef.current !== state.questionId) return;
        const message =
          err && typeof err === 'object' && 'error' in err
            ? String((err as SpeechSynthesisErrorEvent).error)
            : "We couldn't play this word.";
        setSpeechError(message);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.questionId]);

  // Auto-advance after feedback delay
  useEffect(() => {
    if (state.questionStatus !== 'feedback' || !state.lastResult) return;

    const delay =
      state.lastResult.status === 'correct'
        ? FEEDBACK_DELAY_CORRECT_MS
        : FEEDBACK_DELAY_INCORRECT_MS;

    autoAdvanceTimer.current = window.setTimeout(() => {
      autoAdvanceTimer.current = null;
      dispatch({ type: 'NEXT' });
    }, delay);

    return () => {
      if (autoAdvanceTimer.current !== null) {
        window.clearTimeout(autoAdvanceTimer.current);
        autoAdvanceTimer.current = null;
      }
    };
  }, [state.questionStatus, state.lastResult]);

  // Watch for test completion
  useEffect(() => {
    if (!state.session) return;
    if (state.session.status === 'completed' || state.session.status === 'ended-early') {
      const summary = computeScore(state.session);
      const mistakes = uniqueMistakeWords(state.session);
      setLastResult({
        id: state.session.id,
        finishedAt: state.session.endedAt ?? Date.now(),
        totalAnswered: summary.totalAnswered,
        correctCount: summary.correct,
        incorrectCount: summary.incorrect,
        accuracy: summary.accuracy,
      });
      setMistakeWords(mistakes);
      onComplete({
        session: summary,
        words: state.session.words,
        answers: state.session.answers,
        status: state.session.status,
        mistakeWords: mistakes,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.session?.status]);

  const handleSubmit = useCallback(() => {
    if (!state.session || state.currentWord === null) return;
    if (state.questionStatus !== 'answering') return;
    const answer = gradeAnswer(
      state.currentWord,
      state.input,
      state.session.currentIndex,
      'submitted',
    );
    dispatch({ type: 'GRADE', answer });
    speech.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.session, state.currentWord, state.input, state.questionStatus]);

  const handleTimeout = useCallback(() => {
    if (!state.session || state.currentWord === null) return;
    if (state.questionStatus !== 'answering') return;
    const answer = gradeAnswer(
      state.currentWord,
      state.input,
      state.session.currentIndex,
      'timeout',
    );
    dispatch({ type: 'GRADE', answer });
    speech.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.session, state.currentWord, state.input, state.questionStatus]);

  const handleReplay = () => {
    if (!state.currentWord) return;
    if (!speech.supported) {
      setSpeechError("We couldn't play this word.");
      return;
    }
    // Cancel any in-flight speech, then replay. Do NOT touch hasTimerStartedRef.
    speech.cancel();
    // Small delay so the cancel completes in the browser before speaking again
    window.setTimeout(() => {
      if (activeQuestionIdRef.current !== state.questionId) return;
      speech.speak(state.currentWord!, {
        voice: resolvedVoice,
        lang: settings.language,
        rate: settings.speechRate,
        pitch: settings.pitch,
      });
    }, 50);
  };

  const handleEnd = () => setShowEndConfirm(true);
  const handleConfirmEnd = () => {
    speech.cancel();
    if (autoAdvanceTimer.current !== null) {
      window.clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    setShowEndConfirm(false);
    dispatch({ type: 'END_EARLY' });
  };

  if (!state.session) {
    return (
      <div className="text-center text-slate-600 py-10">Preparing your test…</div>
    );
  }

  const totalQuestions = state.session.words.length;
  const questionNumber = Math.min(state.session.currentIndex + 1, totalQuestions);
  const isFeedback = state.questionStatus === 'feedback';
  const isAnswering = state.questionStatus === 'answering';
  const correctCount = state.session.answers.filter((a) => a.status === 'correct').length;
  const incorrectCount = state.session.answers.length - correctCount;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Spelling Practice</h1>
        <Button variant="ghost" size="sm" onClick={handleEnd}>
          <X size={14} aria-hidden="true" className="mr-1" />
          End test
        </Button>
      </header>

      <TestProgress
        currentIndex={state.session.currentIndex}
        total={totalQuestions}
        correct={correctCount}
        incorrect={incorrectCount}
      />

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span className="font-medium text-slate-800">Question {questionNumber}</span>
        <TestTimer
          deadlineMs={state.deadlineMs}
          durationMs={settings.timerEnabled ? settings.secondsPerWord * 1000 : 0}
          onExpire={handleTimeout}
          resetKey={state.questionId ?? 'none'}
        />
      </div>

      <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-6 sm:p-10">
        <div className="flex flex-col items-center gap-6">
          <button
            type="button"
            onClick={handleReplay}
            aria-label="Listen to the word again"
            className="flex flex-col items-center gap-2 text-slate-700 hover:text-accent-700 focus-ring rounded-lg p-3"
            data-testid="replay-btn"
          >
            <span className="rounded-full bg-accent-50 text-accent-700 p-4 border border-accent-100">
              <Volume2 size={32} aria-hidden="true" />
            </span>
            <span className="text-sm font-medium">Listen again</span>
          </button>

          {!speech.supported && (
            <div
              role="alert"
              className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 w-full"
            >
              Audio pronunciation isn't available in this browser. Try a current version of Chrome, Edge, Safari, or another browser with speech synthesis support. You can still type your answer below.
            </div>
          )}

          {speechError && (
            <div
              role="alert"
              className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 w-full flex items-center justify-between gap-2"
            >
              <span>We couldn't play this word.</span>
              <Button variant="secondary" size="sm" onClick={handleReplay}>
                Try again
              </Button>
            </div>
          )}

          <AnswerInput
            value={state.input}
            onChange={(v) => dispatch({ type: 'UPDATE_INPUT', value: v })}
            onSubmit={handleSubmit}
            disabled={!isAnswering}
            inputRef={inputRef}
          />

          <AnswerFeedback answer={state.lastResult} questionStatus={state.questionStatus} />

          {!isFeedback && (
            <p className="text-xs text-slate-500">
              The word will be spoken automatically. Click "Listen again" to replay.
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-center">
        <Button variant="ghost" onClick={onExit} size="sm">
          Back to word library
        </Button>
      </div>

      <Dialog
        open={showEndConfirm}
        title="End this test?"
        description={
          <>
            You have completed {state.session.answers.length} of {totalQuestions} words.
            Future questions will not be counted as incorrect.
          </>
        }
        confirmLabel="End test"
        confirmVariant="danger"
        cancelLabel="Keep practicing"
        onConfirm={handleConfirmEnd}
        onCancel={() => setShowEndConfirm(false)}
      />
    </div>
  );
}