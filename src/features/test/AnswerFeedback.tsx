import { Check, X } from 'lucide-react';
import { diffChars, type DiffPart } from '../../utils/diffChars';
import type { QuestionStatus, TestAnswer } from './testTypes';

interface AnswerFeedbackProps {
  answer: TestAnswer | null;
  questionStatus: QuestionStatus;
}

const HEADINGS = {
  submitted: 'Not quite',
  timeout: "Time's up",
  skipped: 'Skipped',
} as const;

export function AnswerFeedback({ answer, questionStatus }: AnswerFeedbackProps) {
  if (questionStatus !== 'feedback' || !answer) return null;

  const isCorrect = answer.status === 'correct';

  if (isCorrect) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 animate-slide-up"
        data-testid="feedback"
      >
        <Check size={18} aria-hidden="true" />
        <span className="font-semibold">Correct</span>
        <span className="text-emerald-700">— {answer.word}</span>
      </div>
    );
  }

  const typed = answer.userAnswer;
  const diff = diffChars(typed, answer.word);

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-4 animate-slide-up"
      data-testid="feedback"
    >
      <p className="flex items-center gap-1.5 font-semibold text-red-800">
        <X size={18} aria-hidden="true" />
        {HEADINGS[answer.reason]}
      </p>
      <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-slate-600">Correct spelling</dt>
        <dd className="break-words text-lg font-semibold tracking-wide text-slate-900">
          <Highlighted
            parts={diff.expected}
            label={answer.word}
            changedClass="rounded-sm bg-emerald-200 text-emerald-900"
          />
        </dd>
        {typed && (
          <>
            <dt className="text-slate-600">You typed</dt>
            <dd className="break-words text-lg tracking-wide text-slate-700">
              <Highlighted
                parts={diff.typed}
                label={typed}
                changedClass="rounded-sm bg-red-200 text-red-900 line-through decoration-red-500/70"
              />
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}

/** Screen readers get the plain word; the letter-by-letter markup is visual only. */
function Highlighted({
  parts,
  label,
  changedClass,
}: {
  parts: DiffPart[];
  label: string;
  changedClass: string;
}) {
  return (
    <>
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="whitespace-pre-wrap">
        {parts.map((part, i) => (
          <span key={i} className={part.changed ? changedClass : undefined}>
            {part.text}
          </span>
        ))}
      </span>
    </>
  );
}
