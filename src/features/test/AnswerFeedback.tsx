import { Check, X } from 'lucide-react';
import type { TestAnswer } from './testTypes';

interface AnswerFeedbackProps {
  answer: TestAnswer | null;
  questionStatus: 'idle' | 'speaking' | 'answering' | 'grading' | 'feedback';
}

export function AnswerFeedback({ answer, questionStatus }: AnswerFeedbackProps) {
  if (questionStatus !== 'feedback' || !answer) return null;

  const isCorrect = answer.status === 'correct';
  const wasTimeout = answer.reason === 'timeout';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`mt-4 rounded-lg border p-4 ${
        isCorrect
          ? 'border-green-200 bg-green-50'
          : 'border-red-200 bg-red-50'
      }`}
      data-testid="feedback"
    >
      <div className="flex items-center gap-2">
        {isCorrect ? (
          <span className="inline-flex items-center gap-1 text-green-700 font-semibold">
            <Check size={18} aria-hidden="true" />
            Correct
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-red-700 font-semibold">
            <X size={18} aria-hidden="true" />
            {wasTimeout ? "Time's up" : 'Incorrect'}
          </span>
        )}
      </div>
      {!isCorrect && (
        <div className="mt-2 text-sm text-slate-700">
          {wasTimeout ? (
            <p>
              <span className="text-slate-600">Correct spelling: </span>
              <span className="font-semibold text-green-700">{answer.word}</span>
            </p>
          ) : (
            <p>
              <span className="text-slate-600">You wrote: </span>
              <span className="font-mono text-red-700">
                {answer.userAnswer || '(empty)'}
              </span>
              <br />
              <span className="text-slate-600">Correct spelling: </span>
              <span className="font-semibold text-green-700">{answer.word}</span>
            </p>
          )}
        </div>
      )}
      {isCorrect && (
        <div className="mt-2 text-sm text-slate-700">
          <span className="font-semibold text-green-700">{answer.word}</span>
        </div>
      )}
    </div>
  );
}