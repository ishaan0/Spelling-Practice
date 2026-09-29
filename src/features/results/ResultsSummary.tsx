import type { TestSession } from '../test/testTypes';
import { computeScore } from '../test/testUtils';

interface ResultsSummaryProps {
  session: TestSession;
  status: 'completed' | 'ended-early';
}

export function ResultsSummary({ session, status }: ResultsSummaryProps) {
  const summary = computeScore(session);

  return (
    <div className="text-center sm:text-left">
      <h1 className="text-2xl font-semibold text-slate-900">
        {status === 'ended-early' ? 'Test ended early' : 'Test complete'}
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        {status === 'ended-early'
          ? `${summary.totalAnswered} of ${session.words.length} words completed`
          : `${session.words.length} words`}
      </p>

      <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-6 max-w-md mx-auto sm:mx-0">
        <Stat label="Correct" value={summary.correct} tone="green" />
        <Stat label="Incorrect" value={summary.incorrect} tone="red" />
        <Stat label="Accuracy" value={`${summary.accuracy}%`} tone="accent" large />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  large,
}: {
  label: string;
  value: number | string;
  tone: 'green' | 'red' | 'accent';
  large?: boolean;
}) {
  const toneClass =
    tone === 'green'
      ? 'text-green-700 border-green-200 bg-green-50'
      : tone === 'red'
        ? 'text-red-700 border-red-200 bg-red-50'
        : 'text-accent-700 border-accent-200 bg-accent-50';
  return (
    <div className={`rounded-xl border px-3 py-4 ${toneClass}`}>
      <div className={`font-semibold ${large ? 'text-2xl' : 'text-xl'} tabular-nums`}>{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide opacity-80">{label}</div>
    </div>
  );
}