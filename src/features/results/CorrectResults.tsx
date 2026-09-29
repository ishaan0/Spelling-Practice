import { Check } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../components/Card';
import { CopyButton } from './CopyButton';
import type { TestAnswer } from '../test/testTypes';
import { countLabel } from '../../utils/pluralize';

interface CorrectResultsProps {
  answers: TestAnswer[];
}

export function CorrectResults({ answers }: CorrectResultsProps) {
  const correct = answers.filter((a) => a.status === 'correct');
  const copyText = correct.map((a) => a.word).join('\n');

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          Spelled correctly
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-emerald-800">
            {correct.length}
          </span>
        </h2>
        {correct.length > 0 && (
          <div className="-mr-2">
            <CopyButton
              text={copyText}
              label="Copy correct words"
              successMessage={`Copied ${countLabel(correct.length, 'correct word')}`}
            />
          </div>
        )}
      </CardHeader>
      <CardBody>
        {correct.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">
            Nothing here yet — the words you get right will show up here.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {correct.map((a) => (
              <li
                key={a.id}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 py-1 pl-2.5 pr-3 text-sm text-emerald-900"
              >
                <Check size={14} className="shrink-0 text-emerald-600" aria-hidden="true" />
                <span className="truncate">{a.word}</span>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
