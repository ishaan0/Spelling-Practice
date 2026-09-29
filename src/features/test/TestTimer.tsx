import { useEffect, useRef, useState } from 'react';

interface TestTimerProps {
  /** performance.now() ms when the timer should reach zero. Null disables the timer. */
  deadlineMs: number | null;
  durationMs: number;
  /** Called exactly once when the timer expires. */
  onExpire: () => void;
  /** Reset key — bump when starting a new question so the timer resets cleanly. */
  resetKey: string;
}

const FRAME_INTERVAL_MS = 100; // ~10 fps

export function TestTimer({ deadlineMs, durationMs, onExpire, resetKey }: TestTimerProps) {
  const [remaining, setRemaining] = useState<number>(
    deadlineMs !== null ? Math.max(0, deadlineMs - performance.now()) : durationMs,
  );
  const expiredRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const onExpireRef = useRef(onExpire);

  // Always invoke the latest onExpire without restarting the loop
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (deadlineMs === null) return;
    expiredRef.current = false;
    setRemaining(Math.max(0, deadlineMs - performance.now()));
    lastTickRef.current = performance.now();

    const tick = () => {
      const now = performance.now();
      const remainingMs = Math.max(0, deadlineMs - now);
      setRemaining(remainingMs);
      if (remainingMs <= 0) {
        if (!expiredRef.current) {
          expiredRef.current = true;
          onExpireRef.current();
        }
        return;
      }
      if (now - lastTickRef.current >= FRAME_INTERVAL_MS) {
        lastTickRef.current = now;
      }
      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [deadlineMs, resetKey]);

  if (deadlineMs === null) {
    return (
      <span className="text-sm text-slate-500" aria-label="No time limit">
        No timer
      </span>
    );
  }

  const totalSeconds = Math.ceil(remaining / 1000);
  const isLow = totalSeconds <= 5;
  return (
    <span
      className={`tabular-nums font-semibold ${isLow ? 'text-amber-600' : 'text-slate-700'}`}
      aria-live="off"
      data-testid="timer"
    >
      {totalSeconds}s
    </span>
  );
}