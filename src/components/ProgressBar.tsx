interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
}

export function ProgressBar({ value, max, label }: ProgressBarProps) {
  const safeMax = Math.max(1, max);
  const safeValue = Math.min(safeMax, Math.max(0, value));
  const pct = (safeValue / safeMax) * 100;
  return (
    <div
      className="h-2 w-full rounded-full bg-slate-200 overflow-hidden"
      aria-label={label}
      role="progressbar"
      aria-valuenow={safeValue}
      aria-valuemax={safeMax}
      aria-valuemin={0}
    >
      <div
        className="h-full rounded-full bg-accent-500 transition-[width] duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
