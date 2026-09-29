import { useEffect, useRef, useState } from 'react';
import { Timer } from 'lucide-react';

interface TestTimerProps {
  /** performance.now() ms when the timer reaches zero. Null while it isn't running. */
  deadlineMs: number | null;
  /** Full length of the timer, shown before it starts. */
  durationMs: number;
  /** Time left when the timer was paused, if it was running. */
  frozenRemainingMs?: number | null;
  /** Called once when the timer expires. */
  onExpire: () => void;
}

const TICK_MS = 100;
const LOW_TIME_MS = 5000;

export function TestTimer({ deadlineMs, durationMs, frozenRemainingMs = null, onExpire }: TestTimerProps) {
  const [now, setNow] = useState(() => performance.now());
  const onExpireRef = useRef(onExpire);

  // Always invoke the latest onExpire without restarting the clock
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (deadlineMs === null) return;
    setNow(performance.now());
    const ticker = window.setInterval(() => setNow(performance.now()), TICK_MS);
    // A timeout (rather than the display ticker) decides when time is up, so
    // the question still ends on time in a background tab.
    const expiry = window.setTimeout(
      () => onExpireRef.current(),
      Math.max(0, deadlineMs - performance.now()),
    );
    return () => {
      window.clearInterval(ticker);
      window.clearTimeout(expiry);
    };
  }, [deadlineMs]);

  const running = deadlineMs !== null;
  const remaining = running
    ? Math.min(durationMs, Math.max(0, deadlineMs - now))
    : (frozenRemainingMs ?? durationMs);
  const seconds = Math.ceil(remaining / 1000);
  const fraction = durationMs > 0 ? remaining / durationMs : 0;
  const isLow = running && remaining <= LOW_TIME_MS;

  return (
    <div className="flex items-center gap-3" data-testid="timer">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <div
          className={`h-full rounded-full ${isLow ? 'bg-amber-500' : 'bg-accent-400'} ${
            running ? 'transition-[width] duration-100 ease-linear' : ''
          }`}
          style={{ width: `${Math.min(100, Math.max(0, fraction * 100))}%` }}
        />
      </div>
      <span
        className={`flex w-14 shrink-0 items-center justify-end gap-1 text-sm font-semibold tabular-nums ${
          isLow ? 'text-amber-600' : 'text-slate-600'
        }`}
        role="timer"
        aria-label={`${seconds} seconds left`}
      >
        <Timer size={15} aria-hidden="true" />
        {seconds}s
      </span>
    </div>
  );
}
