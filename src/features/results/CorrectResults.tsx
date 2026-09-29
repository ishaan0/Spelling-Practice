import { Check } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../components/Card';
import { CopyButton } from './CopyButton';
import { EmptyState } from '../../components/EmptyState';
import type { TestAnswer } from '../test/testTypes';

interface CorrectResultsProps {
  answers: TestAnswer[];
}

export function CorrectResults({ answers }: CorrectResultsProps) {
  const correct = answers.filter((a) => a.status === 'correct');
  const copyText = correct.map((a) => a.word).join('\n');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <h2 className="text-lg font-medium text-slate-900 flex items-center gap-2">
          <Check size={18} className="text-green-600" aria-hidden="true" />
          Correct <span className="text-slate-500">({correct.length})</span>
        </h2>
        <CopyButton
          text={copyText}
          label="Copy correct words"
          successMessage={`Copied ${correct.length} correct ${correct.length === 1 ? 'word' : 'words'}`}
        />
      </CardHeader>
      <CardBody>
        {correct.length === 0 ? (
          <EmptyState
            title="No correct answers yet"
            description="Keep practicing to see correct spellings here."
          />
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {correct.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-2 text-sm text-slate-800"
              >
                <Check size={14} className="text-green-600 shrink-0" aria-hidden="true" />
                <span className="truncate">{a.word}</span>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}