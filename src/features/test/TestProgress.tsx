import { Check, X } from 'lucide-react';
import { ProgressBar } from '../../components/ProgressBar';

interface TestProgressProps {
  /** Zero-based index of the question on screen. */
  currentIndex: number;
  /** Number of questions answered so far. */
  answered: number;
  total: number;
  correct: number;
  incorrect: number;
}

export function TestProgress({ currentIndex, answered, total, correct, incorrect }: TestProgressProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-semibold text-slate-900">
          Question {Math.min(currentIndex + 1, total)} of {total}
        </span>
        <span className="flex items-center gap-3 font-medium tabular-nums">
          <span className="flex items-center gap-1 text-emerald-700">
            <Check size={15} aria-hidden="true" />
            {correct}
            <span className="sr-only"> correct</span>
          </span>
          <span className="flex items-center gap-1 text-red-700">
            <X size={15} aria-hidden="true" />
            {incorrect}
            <span className="sr-only"> incorrect</span>
          </span>
        </span>
      </div>
      <ProgressBar value={answered} max={total} label="Test progress" />
    </div>
  );
}
