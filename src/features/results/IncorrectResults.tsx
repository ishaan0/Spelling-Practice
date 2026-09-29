import { PartyPopper, Volume2 } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { CopyButton } from './CopyButton';
import type { TestAnswer } from '../test/testTypes';
import { diffChars } from '../../utils/diffChars';
import { countLabel } from '../../utils/pluralize';

interface IncorrectResultsProps {
  answers: TestAnswer[];
  /** Reads a word aloud. Omitted when the browser can't speak. */
  onSpeak?: (word: string) => void;
}

const NO_ANSWER_LABEL = {
  submitted: 'No answer',
  timeout: 'Ran out of time',
  skipped: 'Skipped',
} as const;

export function IncorrectResults({ answers, onSpeak }: IncorrectResultsProps) {
  const incorrect = answers.filter((a) => a.status === 'incorrect');

  if (incorrect.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-900">Needs practice</h2>
        </CardHeader>
        <CardBody>
          <EmptyState
            icon={<PartyPopper size={22} />}
            title="No mistakes"
            description="You spelled every word you answered correctly."
          />
        </CardBody>
      </Card>
    );
  }

  const mistakesText = incorrect
    .map((a) => `${a.userAnswer || '(no answer)'} → ${a.word}`)
    .join('\n');
  const correctedText = incorrect.map((a) => a.word).join('\n');

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          Needs practice
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-red-800">
            {incorrect.length}
          </span>
        </h2>
        <div className="-mr-2 flex flex-wrap">
          <CopyButton text={mistakesText} label="Copy mistakes" />
          <CopyButton
            text={correctedText}
            label="Copy corrected words"
            successMessage={`Copied ${countLabel(incorrect.length, 'corrected word')}`}
          />
        </div>
      </CardHeader>
      <ul className="divide-y divide-slate-100">
        {incorrect.map((a) => {
          const diff = diffChars(a.userAnswer, a.word);
          return (
            <li key={a.id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
              <div className="min-w-0 flex-1">
                <p className="break-words text-base font-semibold tracking-wide text-slate-900">
                  <span className="sr-only">{a.word}</span>
                  <span aria-hidden="true">
                    {diff.expected.map((part, i) => (
                      <span
                        key={i}
                        className={part.changed ? 'rounded-sm bg-emerald-100 text-emerald-800' : undefined}
                      >
                        {part.text}
                      </span>
                    ))}
                  </span>
                </p>
                <p className="mt-0.5 break-words text-sm text-slate-500">
                  {a.userAnswer ? (
                    <>
                      You typed{' '}
                      <span className="font-medium text-red-700 line-through decoration-red-300">
                        {a.userAnswer}
                      </span>
                      {a.reason === 'timeout' && ' before time ran out'}
                    </>
                  ) : (
                    <span className="italic">{NO_ANSWER_LABEL[a.reason]}</span>
                  )}
                </p>
              </div>
              {onSpeak && (
                <button
                  type="button"
                  onClick={() => onSpeak(a.word)}
                  aria-label={`Listen to ${a.word}`}
                  className="shrink-0 rounded-full p-2 text-slate-400 transition-colors hover:bg-accent-50 hover:text-accent-700 focus-ring"
                >
                  <Volume2 size={18} aria-hidden="true" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
