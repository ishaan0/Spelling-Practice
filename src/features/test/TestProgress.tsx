import { ProgressBar } from '../../components/ProgressBar';

interface TestProgressProps {
  currentIndex: number;
  total: number;
  correct: number;
  incorrect: number;
}

export function TestProgress({ currentIndex, total, correct, incorrect }: TestProgressProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between text-sm text-slate-600">
        <span className="font-medium text-slate-800">
          Question {Math.min(currentIndex + 1, total)} of {total}
        </span>
        <span className="text-xs">
          Correct <span className="font-semibold text-green-700">{correct}</span>
          {' · '}
          Incorrect <span className="font-semibold text-red-700">{incorrect}</span>
        </span>
      </div>
      <ProgressBar value={currentIndex} max={total} label="Test progress" />
    </div>
  );
}