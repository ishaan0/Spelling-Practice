import type { TestSession } from '../test/testTypes';
import { computeScore, formatDuration } from '../test/testUtils';
import { countLabel } from '../../utils/pluralize';

interface ResultsSummaryProps {
  session: TestSession;
  status: 'completed' | 'ended-early';
}

function headline(accuracy: number, answered: number): string {
  if (answered === 0) return 'No words answered';
  if (accuracy === 100) return 'Perfect score!';
  if (accuracy >= 80) return 'Great work';
  if (accuracy >= 50) return 'Good effort';
  return 'Keep practising';
}

export function ResultsSummary({ session, status }: ResultsSummaryProps) {
  const summary = computeScore(session);
  const duration =
    session.endedAt !== undefined ? formatDuration(session.endedAt - session.startedAt) : null;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
      <ScoreRing accuracy={summary.accuracy} />

      <div className="min-w-0 flex-1 text-center sm:text-left">
        <p className="text-sm font-medium text-slate-500">
          {status === 'ended-early' ? 'Test ended early' : 'Test complete'}
        </p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900">
          {headline(summary.accuracy, summary.totalAnswered)}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {status === 'ended-early'
            ? `${summary.totalAnswered} of ${countLabel(session.words.length, 'word')} answered`
            : countLabel(session.words.length, 'word')}
          {duration && ` · ${duration}`}
        </p>

        <dl className="mt-5 flex justify-center gap-8 sm:justify-start">
          <Stat label="Correct" value={summary.correct} tone="text-emerald-700" testId="stat-correct" />
          <Stat label="Incorrect" value={summary.incorrect} tone="text-red-700" testId="stat-incorrect" />
        </dl>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  testId,
}: {
  label: string;
  value: number;
  tone: string;
  testId: string;
}) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`text-2xl font-semibold tabular-nums ${tone}`} data-testid={testId}>
        {value}
      </dd>
    </div>
  );
}

const RING_RADIUS = 52;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function ScoreRing({ accuracy }: { accuracy: number }) {
  const color =
    accuracy >= 80 ? 'text-emerald-500' : accuracy >= 50 ? 'text-amber-500' : 'text-red-500';
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle
          cx="60"
          cy="60"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="10"
          className="stroke-slate-100"
        />
        <circle
          cx="60"
          cy="60"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={RING_LENGTH * (1 - accuracy / 100)}
          className={`${color} transition-[stroke-dashoffset] duration-700 ease-out`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold tabular-nums text-slate-900" data-testid="stat-accuracy">
          {accuracy}%
        </span>
        <span className="text-xs font-medium text-slate-500">accuracy</span>
      </div>
    </div>
  );
}
