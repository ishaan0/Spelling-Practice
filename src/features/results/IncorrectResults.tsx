import { X, ArrowRight } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../components/Card';
import { CopyButton } from './CopyButton';
import { EmptyState } from '../../components/EmptyState';
import type { TestAnswer } from '../test/testTypes';

interface IncorrectResultsProps {
  answers: TestAnswer[];
}

export function IncorrectResults({ answers }: IncorrectResultsProps) {
  const incorrect = answers.filter((a) => a.status === 'incorrect');

  if (incorrect.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-slate-900">Incorrect (0)</h2>
        </CardHeader>
        <CardBody>
          <EmptyState
            title="Perfect score!"
            description="You didn't miss any words in this test."
          />
        </CardBody>
      </Card>
    );
  }

  const mistakesText = incorrect
    .map((a) => `${a.userAnswer || '(empty)'} → ${a.word}`)
    .join('\n');
  const correctedText = incorrect.map((a) => a.word).join('\n');

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-medium text-slate-900 flex items-center gap-2">
          <X size={18} className="text-red-600" aria-hidden="true" />
          Incorrect <span className="text-slate-500">({incorrect.length})</span>
        </h2>
        <div className="flex flex-wrap gap-2">
          <CopyButton text={mistakesText} label="Copy mistakes" />
          <CopyButton
            text={correctedText}
            label="Copy corrected words"
            successMessage={`Copied ${incorrect.length} corrected ${incorrect.length === 1 ? 'word' : 'words'}`}
          />
        </div>
      </CardHeader>
      <CardBody>
        <ul className="space-y-2">
          {incorrect.map((a) => (
            <li
              key={a.id}
              className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3 rounded-md border border-slate-200 bg-slate-50/50 p-2 text-sm"
            >
              <span
                className={`truncate font-mono ${a.reason === 'timeout' ? 'text-slate-500 italic' : 'text-red-700'}`}
              >
                {a.reason === 'timeout' ? 'No answer' : a.userAnswer || '(empty)'}
              </span>
              <ArrowRight size={14} className="text-slate-400" aria-hidden="true" />
              <span className="truncate font-semibold text-green-700">{a.word}</span>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}